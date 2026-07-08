from __future__ import annotations

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
