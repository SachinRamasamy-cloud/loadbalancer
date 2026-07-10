from __future__ import annotations

import math
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import require_admin_key
from app.domain.backend import Backend
from app.domain.enums import AlgorithmName
from app.domain.errors import BackendValidationError
from app.schemas.backend import AlgorithmUpdate, BackendCreate, BackendUpdate

router = APIRouter(prefix="/api/control", dependencies=[Depends(require_admin_key)])


@router.get("/overview")
async def overview(request: Request) -> dict:
    container = request.app.state.container
    metrics = await container.metrics.overview()
    backends = await container.registry.list()
    metrics.update({
        "healthy_backends": sum(1 for item in backends if item.status.value == "healthy"),
        "unhealthy_backends": sum(1 for item in backends if item.status.value == "unhealthy"),
        "active_requests": sum(item.active_requests for item in backends),
        "algorithm": container.router.algorithm_name.value,
    })
    return metrics


@router.get("/metrics/timeseries")
async def timeseries(request: Request) -> list[dict]:
    return await request.app.state.container.metrics.timeseries()


@router.get("/logs")
async def logs(request: Request, limit: int = 100) -> list[dict]:
    return await request.app.state.container.metrics.recent_logs(min(max(limit, 1), 500))


@router.get("/backends")
async def list_backends(request: Request) -> list[dict]:
    return [item.to_dict() for item in await request.app.state.container.registry.list()]


@router.post("/backends", status_code=status.HTTP_201_CREATED)
async def create_backend(payload: BackendCreate, request: Request) -> dict:
    try:
        item = await request.app.state.container.registry.add(Backend(
            id=payload.id,
            name=payload.name,
            url=str(payload.url),
            weight=payload.weight,
        ))
        return item.to_dict()
    except BackendValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/backends/{backend_id}")
async def update_backend(backend_id: str, payload: BackendUpdate, request: Request) -> dict:
    try:
        item = await request.app.state.container.registry.update(
            backend_id,
            **payload.model_dump(exclude_unset=True),
        )
        return item.to_dict()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BackendValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/backends/{backend_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backend(backend_id: str, request: Request) -> None:
    try:
        await request.app.state.container.registry.remove(backend_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/backends/{backend_id}/enable")
async def enable_backend(backend_id: str, request: Request) -> dict:
    try:
        return (await request.app.state.container.registry.set_enabled(backend_id, True)).to_dict()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/backends/{backend_id}/disable")
async def disable_backend(backend_id: str, request: Request) -> dict:
    try:
        return (await request.app.state.container.registry.set_enabled(backend_id, False)).to_dict()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/backends/{backend_id}/drain")
async def drain_backend(backend_id: str, request: Request) -> dict:
    try:
        return (await request.app.state.container.registry.drain(backend_id)).to_dict()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/routing")
async def get_routing(request: Request) -> dict:
    return {
        "algorithm": request.app.state.container.router.algorithm_name.value,
        "available": [item.value for item in AlgorithmName],
    }


@router.put("/routing")
async def set_routing(payload: AlgorithmUpdate, request: Request) -> dict:
    try:
        name = AlgorithmName(payload.algorithm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unsupported algorithm") from exc
    await request.app.state.container.router.set_algorithm(name)
    return {"algorithm": name.value}


@router.get("/security/stats")
async def security_stats(request: Request) -> dict:
    container = request.app.state.container
    return await container.security_store.get_stats()


@router.get("/alerts")
async def get_alerts(request: Request) -> dict:
    container = request.app.state.container
    backends = await container.registry.list()

    if not hasattr(request.app.state, "read_alerts"):
        request.app.state.read_alerts = set()

    alerts_list = []

    # Generate dynamic alerts based on backend status
    for b in backends:
        if b.status.value == "unhealthy" and f"unhealthy-{b.id}" not in request.app.state.read_alerts:
            alerts_list.append({
                "id": f"unhealthy-{b.id}",
                "title": f"Health check failed for {b.name}",
                "source": f"Backend: {b.id}",
                "time": "Just now",
                "level": "Critical",
                "color": "#ef4444",
                "background": "#fff1f2"
            })
        elif b.status.value == "draining" and f"draining-{b.id}" not in request.app.state.read_alerts:
            alerts_list.append({
                "id": f"draining-{b.id}",
                "title": f"Traffic draining enabled for {b.name}",
                "source": f"Backend: {b.id}",
                "time": "Just now",
                "level": "Warning",
                "color": "#f59e0b",
                "background": "#fff7e8"
            })
        elif not b.enabled and f"disabled-{b.id}" not in request.app.state.read_alerts:
            alerts_list.append({
                "id": f"disabled-{b.id}",
                "title": f"Backend {b.name} has been disabled",
                "source": f"Backend: {b.id}",
                "time": "Just now",
                "level": "Warning",
                "color": "#f59e0b",
                "background": "#fff7e8"
            })

    # Add dynamic alerts from recent error logs
    recent_logs = await container.metrics.recent_logs(20)
    for log in recent_logs:
        if log.get("error") and f"error-{log['request_id']}" not in request.app.state.read_alerts:
            alerts_list.append({
                "id": f"error-{log['request_id']}",
                "title": f"Proxy error: {log['error']}",
                "source": f"Request ID: {log['request_id']}",
                "time": "Recently",
                "level": "Critical",
                "color": "#ef4444",
                "background": "#fff1f2"
            })
        elif log.get("status_code", 200) >= 400 and f"status-{log['request_id']}" not in request.app.state.read_alerts:
            alerts_list.append({
                "id": f"status-{log['request_id']}",
                "title": f"HTTP {log['status_code']} on {log['method']} {log['path']}",
                "source": f"Request ID: {log['request_id']}",
                "time": "Recently",
                "level": "Warning",
                "color": "#f59e0b",
                "background": "#fff7e8"
            })

    if not alerts_list and not request.app.state.read_alerts:
        alerts_list = [
            {
                "id": "system-start",
                "title": "Load balancer initialized successfully",
                "source": "System",
                "time": "1h ago",
                "level": "Info",
                "color": "#16b8b0",
                "background": "#eafbf9"
            }
        ]

    critical = sum(1 for a in alerts_list if a["level"] == "Critical")
    warning = sum(1 for a in alerts_list if a["level"] == "Warning")
    info = sum(1 for a in alerts_list if a["level"] == "Info")

    return {
        "total": len(alerts_list),
        "critical": critical,
        "warning": warning,
        "info": info,
        "alerts": alerts_list
    }


@router.post("/alerts/mark-all-read")
async def mark_all_alerts_read(request: Request) -> dict:
    if not hasattr(request.app.state, "read_alerts"):
        request.app.state.read_alerts = set()

    res = await get_alerts(request)
    for a in res["alerts"]:
        request.app.state.read_alerts.add(a["id"])

    return {"status": "ok"}


@router.get("/pools")
async def get_pools(request: Request) -> list[dict]:
    container = request.app.state.container
    backends = await container.registry.list()
    algo = container.router.algorithm_name.value

    pools_dict = {
        "App-Web-Pool": [],
        "App-API-Pool": [],
        "Default-Pool": []
    }

    for b in backends:
        b_dict = b.to_dict()
        b_id = b.id.lower()
        if "fast" in b_id or "web" in b_id:
            pools_dict["App-Web-Pool"].append(b_dict)
        elif "slow" in b_id or "unstable" in b_id or "api" in b_id:
            pools_dict["App-API-Pool"].append(b_dict)
        else:
            pools_dict["Default-Pool"].append(b_dict)

    result = []
    for name, s_list in pools_dict.items():
        if not s_list and name == "Default-Pool":
            continue
        if not s_list:
            servers_count = 0
            healthy_count = 0
            reqs_per_sec = 0.0
            bandwidth = "0 bps"
            status_val = "Down"
        else:
            servers_count = len(s_list)
            healthy_count = sum(1 for s in s_list if s["status"] == "healthy")
            total_requests = sum(s["total_requests"] for s in s_list)
            active_reqs = sum(s["active_requests"] for s in s_list)

            reqs_per_sec = round(total_requests / 100, 2) if total_requests > 0 else 0.0
            if active_reqs > 0:
                bandwidth = f"{round(active_reqs * 15.4, 1)} Mbps"
            else:
                bandwidth = f"{round(total_requests * 0.1, 1)} Kbps" if total_requests > 0 else "0 bps"

            if healthy_count == servers_count:
                status_val = "Healthy"
            elif healthy_count > 0:
                status_val = "Warning"
            else:
                status_val = "Down"

        result.append({
            "name": name,
            "algorithm": algo.replace("_", " ").title(),
            "servers": servers_count,
            "healthy": healthy_count,
            "requests": f"{reqs_per_sec}/s" if reqs_per_sec > 0 else "0/s",
            "bandwidth": bandwidth,
            "status": status_val
        })

    return result


@router.get("/analytics")
async def get_analytics(request: Request) -> dict:
    container = request.app.state.container
    async with container.metrics._lock:
        records = list(container.metrics._records)

    total_requests = len(records)

    by_path = {}
    for r in records:
        path = r.path
        if path not in by_path:
            by_path[path] = []
        by_path[path].append(r)

    endpoints_list = []
    performance_list = []

    max_requests = 1
    for path, path_records in by_path.items():
        if len(path_records) > max_requests:
            max_requests = len(path_records)

    for path, path_records in sorted(by_path.items(), key=lambda x: len(x[1]), reverse=True):
        count = len(path_records)
        share_pct = (count / total_requests * 100) if total_requests > 0 else 0.0
        progress_pct = (count / max_requests * 100) if max_requests > 0 else 0.0

        durations = sorted(r.duration_ms for r in path_records)
        avg_lat = sum(durations) / count if count > 0 else 0.0

        def pct(vals, percentile):
            if not vals:
                return 0.0
            idx = max(0, math.ceil(percentile / 100 * len(vals)) - 1)
            return vals[idx]

        p95 = pct(durations, 95)
        p99 = pct(durations, 99)

        errors = sum(1 for r in path_records if r.status_code >= 500 or r.error)
        err_rate = (errors / count * 100) if count > 0 else 0.0

        endpoints_list.append({
            "path": path,
            "requests": f"{count}",
            "share": f"{round(share_pct, 1)}%",
            "progress": int(progress_pct)
        })

        performance_list.append({
            "path": path,
            "requests": f"{count}",
            "avg": f"{round(avg_lat, 1)} ms",
            "p95": f"{round(p95, 1)} ms",
            "p99": f"{round(p99, 1)} ms",
            "error": f"{round(err_rate, 2)}%"
        })

    if not endpoints_list:
        endpoints_list = [
            {"path": "/api/demo", "requests": "0", "share": "0%", "progress": 0},
            {"path": "/healthz", "requests": "0", "share": "0%", "progress": 0}
        ]
        performance_list = [
            {"path": "/api/demo", "requests": "0", "avg": "0 ms", "p95": "0 ms", "p99": "0 ms", "error": "0.0%"}
        ]

    return {
        "endpoints": endpoints_list,
        "performance": performance_list
    }


@router.post("/load-test")
async def start_load_test(request: Request) -> dict:
    container = request.app.state.container
    return await container.load_tester.start_test(duration_seconds=30, concurrency=5)


@router.get("/load-test/active")
async def get_load_test(request: Request) -> dict:
    container = request.app.state.container
    return await container.load_tester.get_test_status()
