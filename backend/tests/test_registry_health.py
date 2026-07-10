import pytest

from app.domain.backend import Backend
from app.domain.enums import BackendStatus


@pytest.mark.asyncio
async def test_health_thresholds_transition_status(app):
    registry = app.state.container.registry
    await registry.add(Backend(id="one", name="One", url="http://one.test"))
    await registry.record_health("one", success=False, latency_ms=10, error="down", healthy_threshold=2, unhealthy_threshold=2)
    assert (await registry.get("one")).status == BackendStatus.UNKNOWN
    await registry.record_health("one", success=False, latency_ms=10, error="down", healthy_threshold=2, unhealthy_threshold=2)
    assert (await registry.get("one")).status == BackendStatus.UNHEALTHY
    await registry.record_health("one", success=True, latency_ms=5, error=None, healthy_threshold=2, unhealthy_threshold=2)
    await registry.record_health("one", success=True, latency_ms=5, error=None, healthy_threshold=2, unhealthy_threshold=2)
    assert (await registry.get("one")).status == BackendStatus.HEALTHY
