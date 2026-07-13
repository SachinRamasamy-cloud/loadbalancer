from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy import text

from app.db.database import Database
from app.domain.backend import Backend
from app.domain.enums import BackendStatus


def _json(value: Any) -> str:
    return json.dumps(value, default=str, separators=(",", ":"))


class BackendRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def list_backends(self) -> list[Backend]:
        if not self.database.available:
            return []
        query = text("""
            select id, name, url, weight, enabled, status, active_requests,
                   total_requests, total_errors, last_latency_ms,
                   last_checked_at, last_error, consecutive_successes,
                   consecutive_failures
            from public.lf_v_backend_status
            order by id
        """)
        async with self.database.session() as session:
            rows = (await session.execute(query)).mappings().all()
        return [
            Backend(
                id=row["id"],
                name=row["name"],
                url=row["url"],
                weight=row["weight"],
                enabled=row["enabled"],
                status=BackendStatus(row["status"]),
                active_requests=row["active_requests"],
                total_requests=row["total_requests"],
                total_errors=row["total_errors"],
                last_latency_ms=float(row["last_latency_ms"]) if row["last_latency_ms"] is not None else None,
                last_checked_at=row["last_checked_at"].isoformat() if row["last_checked_at"] else None,
                last_error=row["last_error"],
                consecutive_successes=row["consecutive_successes"],
                consecutive_failures=row["consecutive_failures"],
            )
            for row in rows
        ]

    async def upsert(self, backend: Backend) -> None:
        if not self.database.available:
            return
        query = text("select (public.lf_upsert_backend(:id, :name, :url, :weight, :enabled)).id")
        async with self.database.session() as session:
            await session.execute(query, {
                "id": backend.id,
                "name": backend.name,
                "url": backend.url,
                "weight": backend.weight,
                "enabled": backend.enabled,
            })
            await session.commit()

    async def soft_delete(self, backend_id: str, actor_id: str | None = None) -> None:
        if not self.database.available:
            return
        query = text("select public.lf_soft_delete_backend(:id, :actor, :reason)")
        async with self.database.session() as session:
            await session.execute(query, {"id": backend_id, "actor": actor_id, "reason": "Removed through control API"})
            await session.commit()

    async def set_enabled(self, backend_id: str, enabled: bool, actor_id: str | None = None) -> None:
        if not self.database.available:
            return
        query = text("select (public.lf_set_backend_enabled(:id, :enabled, :actor, :reason)).id")
        async with self.database.session() as session:
            await session.execute(query, {
                "id": backend_id,
                "enabled": enabled,
                "actor": actor_id,
                "reason": "Updated through control API",
            })
            await session.commit()

    async def drain(self, backend_id: str, actor_id: str | None = None) -> None:
        if not self.database.available:
            return
        query = text("select public.lf_set_backend_draining(:id, :actor, :reason)")
        async with self.database.session() as session:
            await session.execute(query, {"id": backend_id, "actor": actor_id, "reason": "Drain requested"})
            await session.commit()

    async def record_health(
        self,
        backend_id: str,
        *,
        success: bool,
        latency_ms: float,
        status_code: int | None,
        error_type: str | None,
        error_message: str | None,
        healthy_threshold: int,
        unhealthy_threshold: int,
    ) -> None:
        if not self.database.available:
            return
        query = text("""
            select (public.lf_record_backend_health(
                :backend_id, :success, :latency_ms, :status_code,
                :error_type, :error_message, :healthy_threshold,
                :unhealthy_threshold, cast(:metadata as jsonb)
            )).backend_id
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "backend_id": backend_id,
                "success": success,
                "latency_ms": latency_ms,
                "status_code": status_code,
                "error_type": error_type,
                "error_message": error_message,
                "healthy_threshold": healthy_threshold,
                "unhealthy_threshold": unhealthy_threshold,
                "metadata": "{}",
            })
            await session.commit()


class RoutingRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def get_algorithm(self) -> str | None:
        if not self.database.available:
            return None
        query = text("select algorithm from public.routing_configuration where singleton_id = 1")
        async with self.database.session() as session:
            return (await session.execute(query)).scalar_one_or_none()

    async def set_algorithm(self, algorithm: str, actor_id: str | None = None) -> None:
        if not self.database.available:
            return
        query = text("select (public.lf_set_routing_algorithm(:algorithm, '{}'::jsonb, :actor, :reason)).algorithm")
        async with self.database.session() as session:
            await session.execute(query, {
                "algorithm": algorithm,
                "actor": actor_id,
                "reason": "Changed through control API",
            })
            await session.commit()


class ApiHistoryRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def enqueue_many(self, events: list[dict[str, Any]]) -> None:
        if not self.database.available or not events:
            return
        query = text("""
            select public.lf_enqueue_api_ingest_job(
                :request_id, :correlation_id, :http_method, :route,
                :query_present, :received_at, :priority, :max_attempts,
                cast(:payload as jsonb)
            )
        """)
        params = []
        for event in events:
            request_data = event["request"]
            params.append({
                "request_id": request_data["request_id"],
                "correlation_id": request_data.get("correlation_id"),
                "http_method": request_data["http_method"],
                "route": request_data["route"],
                "query_present": request_data.get("query_present", False),
                "received_at": request_data["received_at"],
                "priority": 100,
                "max_attempts": 5,
                "payload": _json(event),
            })
        async with self.database.session() as session:
            await session.execute(query, params)
            await session.commit()

    async def claim(self, worker_id: str, batch_size: int, lock_timeout_seconds: int) -> list[dict[str, Any]]:
        if not self.database.available:
            return []
        query = text("select * from public.lf_claim_api_ingest_jobs(:worker_id, :batch_size, :lock_timeout)")
        async with self.database.session() as session:
            rows = (await session.execute(query, {
                "worker_id": worker_id,
                "batch_size": batch_size,
                "lock_timeout": lock_timeout_seconds,
            })).mappings().all()
            await session.commit()
        return [dict(row) for row in rows]

    async def save_and_complete(self, job_id: str, worker_id: str, payload: dict[str, Any]) -> None:
        query = text("""
            select public.lf_save_api_request_and_complete_job(
                cast(:job_id as uuid), :worker_id,
                cast(:request_data as jsonb), cast(:attempts as jsonb)
            )
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "job_id": job_id,
                "worker_id": worker_id,
                "request_data": _json(payload["request"]),
                "attempts": _json(payload.get("attempts", [])),
            })
            await session.commit()

    async def fail(self, job_id: str, worker_id: str, exc: Exception, retry_delay_seconds: int = 5) -> None:
        if not self.database.available:
            return
        query = text("""
            select public.lf_fail_api_ingest_job(
                cast(:job_id as uuid), :worker_id, :error_type,
                :error_code, :error_message, :retry_delay
            )
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "job_id": job_id,
                "worker_id": worker_id,
                "error_type": type(exc).__name__,
                "error_code": "API_HISTORY_WRITE_FAILED",
                "error_message": str(exc)[:2000],
                "retry_delay": retry_delay_seconds,
            })
            await session.commit()

    async def recent(self, limit: int = 100) -> list[dict[str, Any]]:
        if not self.database.available:
            return []
        query = text("""
            select request_id, timestamp, method, path, backend_id,
                   status_code, duration_ms, error, retry_count
            from public.lf_v_recent_request_logs
            order by timestamp desc
            limit :limit
        """)
        async with self.database.session() as session:
            rows = (await session.execute(query, {"limit": limit})).mappings().all()
        return [dict(row) for row in rows]

    async def get_request(self, request_id: str) -> dict[str, Any] | None:
        if not self.database.available:
            return None
        request_query = text("select * from public.api_request_history where request_id = :request_id")
        attempts_query = text("""
            select * from public.api_request_attempts
            where request_id = :request_id
            order by attempt_number
        """)
        async with self.database.session() as session:
            row = (await session.execute(request_query, {"request_id": request_id})).mappings().one_or_none()
            if row is None:
                return None
            attempts = (await session.execute(attempts_query, {"request_id": request_id})).mappings().all()
        result = dict(row)
        result["attempts"] = [dict(item) for item in attempts]
        return result

    async def list_requests(self, *, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        if not self.database.available:
            return []
        query = text("""
            select * from public.api_request_history
            order by received_at desc
            limit :limit offset :offset
        """)
        async with self.database.session() as session:
            rows = (await session.execute(query, {"limit": limit, "offset": offset})).mappings().all()
        return [dict(row) for row in rows]


class DashboardRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def overview(self) -> dict[str, Any] | None:
        if not self.database.available:
            return None
        async with self.database.session() as session:
            row = (await session.execute(text("select * from public.lf_v_request_overview_24h"))).mappings().one_or_none()
            status_rows = (await session.execute(text("""
                select final_status_code::text as code, count(*)::bigint as total
                from public.api_request_history
                where received_at >= now() - interval '24 hours'
                group by final_status_code
            """))).mappings().all()
            backend_rows = (await session.execute(text("select backend_id, request_count from public.lf_v_backend_distribution_24h"))).mappings().all()
        if row is None:
            return None
        result = dict(row)
        result["status_codes"] = {item["code"]: item["total"] for item in status_rows}
        result["backend_distribution"] = {item["backend_id"]: item["request_count"] for item in backend_rows}
        return result

    async def timeseries(self, limit: int = 20) -> list[dict[str, Any]]:
        if not self.database.available:
            return []
        query = text("""
            select bucket_start, requests, errors, average_latency_ms
            from public.lf_v_request_timeseries_15s
            order by bucket_start desc
            limit :limit
        """)
        async with self.database.session() as session:
            rows = list(reversed((await session.execute(query, {"limit": limit})).mappings().all()))
        return [{
            "time": row["bucket_start"].strftime("%H:%M:%S"),
            "requests": row["requests"],
            "errors": row["errors"],
            "avg_latency_ms": float(row["average_latency_ms"] or 0),
        } for row in rows]

    async def analytics(self) -> dict[str, Any]:
        if not self.database.available:
            return {"endpoints": [], "performance": []}
        query = text("select * from public.lf_v_endpoint_analytics_24h order by requests desc")
        async with self.database.session() as session:
            rows = (await session.execute(query)).mappings().all()
        total = sum(int(row["requests"]) for row in rows)
        maximum = max((int(row["requests"]) for row in rows), default=1)
        endpoints = []
        performance = []
        for row in rows:
            count = int(row["requests"])
            endpoints.append({
                "path": row["path"],
                "requests": str(count),
                "share": f"{round(count / total * 100, 1) if total else 0}%",
                "progress": int(count / maximum * 100) if maximum else 0,
            })
            performance.append({
                "path": row["path"],
                "requests": str(count),
                "avg": f"{float(row['average_latency_ms'] or 0):.1f} ms",
                "p95": f"{float(row['p95_latency_ms'] or 0):.1f} ms",
                "p99": f"{float(row['p99_latency_ms'] or 0):.1f} ms",
                "error": f"{float(row['error_rate'] or 0):.2f}%",
            })
        return {"endpoints": endpoints, "performance": performance}

    async def alerts(self, actor_id: str = "default-admin", limit: int = 100) -> list[dict[str, Any]]:
        if not self.database.available:
            return []
        query = text("select * from public.lf_get_active_alerts(:actor_id, :limit)")
        async with self.database.session() as session:
            rows = (await session.execute(query, {"actor_id": actor_id, "limit": limit})).mappings().all()
        colors = {"Critical": ("#ef4444", "#fff1f2"), "Warning": ("#f59e0b", "#fff7e8"), "Info": ("#16b8b0", "#eafbf9")}
        output = []
        for row in rows:
            color, background = colors.get(row["level"], colors["Info"])
            output.append({
                "id": row["alert_key"],
                "title": row["title"],
                "source": row["source"],
                "time": row["occurred_at"].isoformat(),
                "level": row["level"],
                "color": color,
                "background": background,
            })
        return output

    async def acknowledge_alerts(self, alert_ids: Iterable[str], actor_id: str = "default-admin") -> None:
        if not self.database.available:
            return
        query = text("select public.lf_acknowledge_alert(:alert_id, :actor_id, null)")
        params = [{"alert_id": alert_id, "actor_id": actor_id} for alert_id in alert_ids]
        if not params:
            return
        async with self.database.session() as session:
            await session.execute(query, params)
            await session.commit()


class SecurityRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def record(self, event_type: str, title: str, ip: str, *, severity: str = "warning", blocked: bool = False) -> None:
        if not self.database.available:
            return
        query = text("""
            select public.lf_record_security_event(
                :event_type, :title, cast(:ip as inet), :severity,
                null, null, null, null, :blocked, null, '{}'::jsonb
            )
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "event_type": event_type,
                "title": title,
                "ip": None if ip == "unknown" else ip,
                "severity": severity,
                "blocked": blocked,
            })
            await session.commit()


class LoadTestRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    async def start(self, data: dict[str, Any]) -> str | None:
        if not self.database.available:
            return None
        query = text("""
            select public.lf_start_load_test(
                :external_id, :target_path, :duration, :concurrency,
                :algorithm, :name, :created_by, cast(:parameters as jsonb)
            )
        """)
        async with self.database.session() as session:
            value = (await session.execute(query, {
                "external_id": data["id"],
                "target_path": data["target"],
                "duration": data["duration"],
                "concurrency": data["concurrency"],
                "algorithm": data.get("algorithm"),
                "name": data.get("name"),
                "created_by": "control-api",
                "parameters": _json({}),
            })).scalar_one()
            await session.commit()
        return str(value)

    async def sample(self, run_id: str, data: dict[str, Any]) -> None:
        if not self.database.available:
            return
        query = text("""
            select public.lf_record_load_test_sample(
                cast(:run_id as uuid), :progress, :throughput,
                :avg, :p50, :p95, :p99, :success_count,
                :error_count, :error_rate, '{}'::jsonb
            )
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "run_id": run_id,
                "progress": data["progress"],
                "throughput": data["throughput"],
                "avg": data["avg_latency"],
                "p50": data.get("p50_latency", data["avg_latency"]),
                "p95": data["p95_latency"],
                "p99": data.get("p99_latency", data["p95_latency"]),
                "success_count": data["success_count"],
                "error_count": data["error_count"],
                "error_rate": data["error_rate"],
            })
            await session.commit()

    async def finish(self, run_id: str, data: dict[str, Any]) -> None:
        if not self.database.available:
            return
        query = text("""
            select (public.lf_finish_load_test(
                cast(:run_id as uuid), :status, :throughput, :avg,
                :p50, :p95, :p99, :success_count, :error_count,
                :error_rate, '{}'::jsonb
            )).id
        """)
        async with self.database.session() as session:
            await session.execute(query, {
                "run_id": run_id,
                "status": data["status"].lower(),
                "throughput": data["throughput"],
                "avg": data["avg_latency"],
                "p50": data.get("p50_latency", data["avg_latency"]),
                "p95": data["p95_latency"],
                "p99": data.get("p99_latency", data["p95_latency"]),
                "success_count": data["success_count"],
                "error_count": data["error_count"],
                "error_rate": data["error_rate"],
            })
            await session.commit()
