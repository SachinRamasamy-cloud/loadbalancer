from collections import Counter

import pytest

from app.domain.backend import Backend
from app.domain.enums import BackendStatus
from app.services.algorithms.least_inflight import LeastInflight
from app.services.algorithms.round_robin import RoundRobin
from app.services.algorithms.smooth_weighted import SmoothWeightedRoundRobin


def backend(identifier: str, *, weight: int = 1, active: int = 0) -> Backend:
    return Backend(
        id=identifier,
        name=identifier,
        url=f"http://{identifier}.test",
        weight=weight,
        active_requests=active,
        status=BackendStatus.HEALTHY,
    )


@pytest.mark.asyncio
async def test_round_robin_cycles_in_stable_order():
    algorithm = RoundRobin()
    values = [backend("b"), backend("a"), backend("c")]
    selected = [(await algorithm.select(values)).id for _ in range(5)]
    assert selected == ["a", "b", "c", "a", "b"]


@pytest.mark.asyncio
async def test_least_inflight_respects_weighted_capacity():
    algorithm = LeastInflight()
    selected = await algorithm.select([
        backend("small", weight=1, active=2),
        backend("large", weight=4, active=4),
    ])
    assert selected.id == "large"


@pytest.mark.asyncio
async def test_smooth_weighted_distribution():
    algorithm = SmoothWeightedRoundRobin()
    values = [backend("heavy", weight=3), backend("light", weight=1)]
    selected = [(await algorithm.select(values)).id for _ in range(40)]
    counts = Counter(selected)
    assert counts == {"heavy": 30, "light": 10}
