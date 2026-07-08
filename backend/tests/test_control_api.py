import pytest


@pytest.mark.asyncio
async def test_control_api_requires_key(client):
    response = await client.get("/api/control/backends")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_disable_backend(client):
    headers = {"X-Admin-API-Key": "test-key"}
    created = await client.post("/api/control/backends", headers=headers, json={
        "id": "one",
        "name": "Backend One",
        "url": "http://one.test",
        "weight": 2,
    })
    assert created.status_code == 201
    assert created.json()["weight"] == 2

    disabled = await client.post("/api/control/backends/one/disable", headers=headers)
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "disabled"
    assert disabled.json()["eligible"] is False


@pytest.mark.asyncio
async def test_rejects_unapproved_backend_host(client):
    response = await client.post(
        "/api/control/backends",
        headers={"X-Admin-API-Key": "test-key"},
        json={"id": "bad", "name": "Bad Host", "url": "http://evil.example", "weight": 1},
    )
    assert response.status_code == 400
