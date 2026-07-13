from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.control import router as control_router
from app.api.proxy import router as proxy_router
from app.container import Container
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging


def create_app(
    settings: Settings | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    container = Container(settings, transport=transport)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await container.database.start()
        if container.database.available:
            await container.registry.hydrate()
            await container.router.hydrate()
            container.api_history_worker.start()

        await container.registry.seed(settings.seed_backends)

        health_task: asyncio.Task | None = None
        if settings.health_check_enabled:
            await container.health.check_all()
            health_task = asyncio.create_task(
                container.health.run(),
                name="backend-health-checker",
            )

        yield

        container.health.stop()
        if health_task:
            health_task.cancel()
            try:
                await health_task
            except asyncio.CancelledError:
                pass

        await container.api_history_worker.stop()
        await container.http_client.aclose()
        await container.database.close()

    app = FastAPI(
        title="LoadFlow Balancer",
        version="2.0.0",
        lifespan=lifespan,
    )
    app.state.container = container
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "content-type",
            "x-admin-api-key",
            "x-request-id",
            "x-correlation-id",
        ],
    )

    @app.get("/healthz", tags=["platform"])
    async def platform_health() -> dict:
        database = await container.database.health()
        return {
            "status": "ok" if not settings.database_required or database["available"] else "degraded",
            "database": database,
            "api_history_worker": container.api_history_worker.status(),
        }

    app.include_router(control_router)
    app.include_router(proxy_router)
    return app


app = create_app()
