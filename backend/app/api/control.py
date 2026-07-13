from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

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
        "database_enabled": container.database.enabled,
        "database_available": container.database.available,
    })
    return metrics


@router.get("/metrics/timeseries")
async def timeseries(request: Request) -> list[dict]:
    return await request.app.state.container.metrics.timeseries()


@router.get("/logs")
async def logs(request: Request, limit: int = 100) -> list[dict]:
    return await request.app.state.container.metrics.recent_logs(min(max(limit, 1), 500))


@router.get("/database/status")
async def database_status(request: Request) -> dict:
    container = request.app.state.container
    return {
        "database": await container.database.health(),
        "api_history_worker": container.api_history_worker.status(),
    }


@router.get("/history/requests")
async def request_history(
    request: Request,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[dict]:
    container = request.app.state.container
    if not container.database.available:
        raise HTTPException(status_code=503, detail="Database is not available")
    return await container.history_repository.list_requests(limit=limit, offset=offset)


@router.get("/history/requests/{request_id}")
async def request_history_detail(request_id: str, request: Request) -> dict:
    container = request.app.state.container
    if not container.database.available:
        raise HTTPException(status_code=503, detail="Database is not available")
    item = await container.history_repository.get_request(request_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Request history not found")
    return item


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
    return await request.app.state.container.security_store.get_stats()


@router.get("/alerts")
async def get_alerts(request: Request) -> dict:
    container = request.app.state.container

    if container.database.available:
        alerts_list = await container.dashboard_repository.alerts()
    else:
        if not hasattr(request.app.state, "read_alerts"):
            request.app.state.read_alerts = set()
        alerts_list = await _memory_alerts(request)

    if not alerts_list and not container.database.available and not request.app.state.read_alerts:
        alerts_list = [{
            "id": "system-start",
            "title": "Load balancer initialized successfully",
            "source": "System",
            "time": "1h ago",
            "level": "Info",
            "color": "#16b8b0",
            "background": "#eafbf9",
        }]

    return {
        "total": len(alerts_list),
        "critical": sum(1 for item in alerts_list if item["level"] == "Critical"),
        "warning": sum(1 for item in alerts_list if item["level"] == "Warning"),
        "info": sum(1 for item in alerts_list if item["level"] == "Info"),
        "alerts": alerts_list,
    }


async def _memory_alerts(request: Request) -> list[dict]:
    container = request.app.state.container
    backends = await container.registry.list()
    alerts_list: list[dict] = []

    for backend in backends:
        alert_id = None
        title = None
        level = "Warning"
        if backend.status.value == "unhealthy":
            alert_id = f"unhealthy-{backend.id}"
            title = f"Health check failed for {backend.name}"
            level = "Critical"
        elif backend.status.value == "draining":
            alert_id = f"draining-{backend.id}"
            title = f"Traffic draining enabled for {backend.name}"
        elif not backend.enabled:
            alert_id = f"disabled-{backend.id}"
            title = f"Backend {backend.name} has been disabled"

        if alert_id and alert_id not in request.app.state.read_alerts:
            alerts_list.append({
                "id": alert_id,
                "title": title,
                "source": f"Backend: {backend.id}",
                "time": "Just now",
                "level": level,
                "color": "#ef4444" if level == "Critical" else "#f59e0b",
                "background": "#fff1f2" if level == "Critical" else "#fff7e8",
            })

    recent_logs = await container.metrics.recent_logs(20)
    for log in recent_logs:
        if log.get("error"):
            alert_id = f"error-{log['request_id']}"
            if alert_id not in request.app.state.read_alerts:
                alerts_list.append({
                    "id": alert_id,
                    "title": f"Proxy error: {log['error']}",
                    "source": f"Request ID: {log['request_id']}",
                    "time": "Recently",
                    "level": "Critical",
                    "color": "#ef4444",
                    "background": "#fff1f2",
                })
        elif log.get("status_code", 200) >= 400:
            alert_id = f"status-{log['request_id']}"
            if alert_id not in request.app.state.read_alerts:
                alerts_list.append({
                    "id": alert_id,
                    "title": f"HTTP {log['status_code']} on {log['method']} {log['path']}",
                    "source": f"Request ID: {log['request_id']}",
                    "time": "Recently",
                    "level": "Warning",
                    "color": "#f59e0b",
                    "background": "#fff7e8",
                })
    return alerts_list


@router.post("/alerts/mark-all-read")
async def mark_all_alerts_read(request: Request) -> dict:
    container = request.app.state.container
    result = await get_alerts(request)
    ids = [item["id"] for item in result["alerts"]]
    if container.database.available:
        await container.dashboard_repository.acknowledge_alerts(ids)
    else:
        if not hasattr(request.app.state, "read_alerts"):
            request.app.state.read_alerts = set()
        request.app.state.read_alerts.update(ids)
    return {"status": "ok"}


@router.get("/pools")
async def get_pools(request: Request) -> list[dict]:
    container = request.app.state.container
    backends = await container.registry.list()
    algorithm = container.router.algorithm_name.value

    pools_dict = {
        "App-Web-Pool": [],
        "App-API-Pool": [],
        "Default-Pool": [],
    }
    for backend in backends:
        item = backend.to_dict()
        backend_id = backend.id.lower()
        if "fast" in backend_id or "web" in backend_id:
            pools_dict["App-Web-Pool"].append(item)
        elif any(token in backend_id for token in ("slow", "unstable", "api")):
            pools_dict["App-API-Pool"].append(item)
        else:
            pools_dict["Default-Pool"].append(item)

    result = []
    for name, servers in pools_dict.items():
        if not servers and name == "Default-Pool":
            continue
        server_count = len(servers)
        healthy_count = sum(1 for item in servers if item["status"] == "healthy")
        total_requests = sum(item["total_requests"] for item in servers)
        active_requests = sum(item["active_requests"] for item in servers)
        requests_per_second = round(total_requests / 100, 2) if total_requests else 0.0
        bandwidth = (
            f"{round(active_requests * 15.4, 1)} Mbps"
            if active_requests
            else f"{round(total_requests * 0.1, 1)} Kbps" if total_requests else "0 bps"
        )
        pool_status = (
            "Healthy" if server_count and healthy_count == server_count
            else "Warning" if healthy_count > 0
            else "Down"
        )
        result.append({
            "name": name,
            "algorithm": algorithm.replace("_", " ").title(),
            "servers": server_count,
            "healthy": healthy_count,
            "requests": f"{requests_per_second}/s" if requests_per_second else "0/s",
            "bandwidth": bandwidth,
            "status": pool_status,
        })
    return result


@router.get("/analytics")
async def get_analytics(request: Request) -> dict:
    container = request.app.state.container
    if container.database.available:
        data = await container.dashboard_repository.analytics()
        if data["endpoints"]:
            return data

    async with container.metrics._lock:
        records = list(container.metrics._records)

    total_requests = len(records)
    by_path: dict[str, list] = {}
    for record in records:
        by_path.setdefault(record.path, []).append(record)

    endpoints_list = []
    performance_list = []
    maximum = max((len(items) for items in by_path.values()), default=1)

    for path, path_records in sorted(by_path.items(), key=lambda value: len(value[1]), reverse=True):
        count = len(path_records)
        durations = sorted(item.duration_ms for item in path_records)
        average = sum(durations) / count if count else 0.0
        p95 = durations[max(0, math.ceil(0.95 * len(durations)) - 1)] if durations else 0.0
        p99 = durations[max(0, math.ceil(0.99 * len(durations)) - 1)] if durations else 0.0
        errors = sum(1 for item in path_records if item.status_code >= 500 or item.error)
        endpoints_list.append({
            "path": path,
            "requests": str(count),
            "share": f"{round(count / total_requests * 100, 1) if total_requests else 0}%",
            "progress": int(count / maximum * 100) if maximum else 0,
        })
        performance_list.append({
            "path": path,
            "requests": str(count),
            "avg": f"{average:.1f} ms",
            "p95": f"{p95:.1f} ms",
            "p99": f"{p99:.1f} ms",
            "error": f"{(errors / count * 100) if count else 0:.2f}%",
        })

    if not endpoints_list:
        endpoints_list = [
            {"path": "/api/demo", "requests": "0", "share": "0%", "progress": 0},
            {"path": "/healthz", "requests": "0", "share": "0%", "progress": 0},
        ]
        performance_list = [
            {"path": "/api/demo", "requests": "0", "avg": "0 ms", "p95": "0 ms", "p99": "0 ms", "error": "0.0%"}
        ]

    return {"endpoints": endpoints_list, "performance": performance_list}


@router.post("/load-test")
async def start_load_test(request: Request) -> dict:
    return await request.app.state.container.load_tester.start_test(
        duration_seconds=30,
        concurrency=5,
    )


@router.get("/load-test/active")
async def get_load_test(request: Request) -> dict:
    return await request.app.state.container.load_tester.get_test_status()
