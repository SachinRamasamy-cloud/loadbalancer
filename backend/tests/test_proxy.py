import pytest

from app.domain.backend import Backend
from app.domain.enums import BackendStatus


@pytest.mark.asyncio
async def test_proxy_forwards_to_backend_and_returns_debug_header(app, client):
    app.state.container.settings.expose_selected_backend_header = True
    item = await app.state.container.registry.add(Backend(
        id="one",
        name="One",
        url="http://one.test",
        status=BackendStatus.HEALTHY,
    ))
    response = await client.get("/api/demo?value=1")
    assert response.status_code == 200
    assert response.json()["host"] == "one.test"
    assert response.headers["x-selected-backend"] == "one"


@pytest.mark.asyncio
async def test_proxy_returns_503_without_backend(client):
    response = await client.get("/anything")
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_request_size_limit_is_enforced(app, client):
    app.state.container.settings.max_request_body_bytes = 5
    await app.state.container.registry.add(Backend(
        id="one",
        name="One",
        url="http://one.test",
        status=BackendStatus.HEALTHY,
    ))
    response = await client.post("/echo", content=b"123456")
    assert response.status_code == 413
