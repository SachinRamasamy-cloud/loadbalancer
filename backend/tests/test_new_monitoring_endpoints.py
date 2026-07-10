import pytest


@pytest.mark.asyncio
async def test_security_stats_endpoint(client):
    headers = {"X-Admin-API-Key": "test-key"}
    # Verify unauthorized request triggers an auth failure event inside store
    res_unauth = await client.get("/api/control/security/stats")
    assert res_unauth.status_code == 401

    import asyncio
    await asyncio.sleep(0.05)

    # Check that stats contains the logged auth failure
    res = await client.get("/api/control/security/stats", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "blocked_ips_count" in data
    assert "rate_limit_hits" in data
    assert "auth_failures" in data
    assert data["auth_failures"] >= 1
    assert len(data["blocked_ips"]) >= 1
    assert len(data["events"]) >= 1


@pytest.mark.asyncio
async def test_alerts_endpoints(client):
    headers = {"X-Admin-API-Key": "test-key"}

    # Get active alerts
    res = await client.get("/api/control/alerts", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "alerts" in data
    assert len(data["alerts"]) > 0

    # Mark all read
    res_mark = await client.post("/api/control/alerts/mark-all-read", headers=headers)
    assert res_mark.status_code == 200

    # Alerts should be cleared (read_alerts contains their IDs now)
    res_after = await client.get("/api/control/alerts", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["total"] == 0


@pytest.mark.asyncio
async def test_pools_endpoint(client):
    headers = {"X-Admin-API-Key": "test-key"}
    res = await client.get("/api/control/pools", headers=headers)
    assert res.status_code == 200
    pools = res.json()
    assert isinstance(pools, list)
    for p in pools:
        assert "name" in p
        assert "servers" in p
        assert "healthy" in p
        assert "status" in p


@pytest.mark.asyncio
async def test_analytics_endpoint(client):
    headers = {"X-Admin-API-Key": "test-key"}
    res = await client.get("/api/control/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "endpoints" in data
    assert "performance" in data


@pytest.mark.asyncio
async def test_load_testing_endpoints(client):
    headers = {"X-Admin-API-Key": "test-key"}

    # Get active load test status
    res = await client.get("/api/control/load-test/active", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] in ["Idle", "Running", "Completed"]

    # Start a load test
    res_start = await client.post("/api/control/load-test", headers=headers)
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "Running"
