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


def create_app(settings: Settings | None = None, transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    container = Container(settings, transport=transport)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await container.registry.seed(settings.seed_backends)
        task: asyncio.Task | None = None
        if settings.health_check_enabled:
            await container.health.check_all()
            task = asyncio.create_task(container.health.run(), name="backend-health-checker")
        yield
        container.health.stop()
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        await container.http_client.aclose()

    app = FastAPI(title="Engineering Load Balancer", version="1.0.0", lifespan=lifespan)
    app.state.container = container
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["content-type", "x-admin-api-key", "x-request-id"],
    )

    @app.get("/healthz", tags=["platform"])
    async def platform_health() -> dict:
        return {"status": "ok"}

    app.include_router(control_router)
    app.include_router(proxy_router)
    return app


app = create_app()
