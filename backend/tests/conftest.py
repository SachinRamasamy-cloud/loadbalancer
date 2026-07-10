import httpx
import pytest

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        admin_api_key="test-key",
        health_check_enabled=False,
        allow_private_backends=True,
        allowed_backend_hosts=("one.test", "two.test", "weighted.test"),
        rate_limit_requests=1000,
        seed_backends=[],
    )


@pytest.fixture
async def app(settings):
    async def handler(request: httpx.Request) -> httpx.Response:
        host = request.url.host
        if request.url.path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        return httpx.Response(200, json={"host": host, "path": request.url.path})

    application = create_app(settings, transport=httpx.MockTransport(handler))
    async with application.router.lifespan_context(application):
        yield application


@pytest.fixture
async def client(app):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://lb.test") as value:
        yield value
