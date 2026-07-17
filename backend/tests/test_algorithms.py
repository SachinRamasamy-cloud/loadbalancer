from collections import Counter

import pytest

from app.domain.backend import Backend
from app.domain.enums import BackendStatus
from app.services.algorithms.smooth_weighted import (
    SmoothWeightedRoundRobin,
)


def create_backend(
    identifier: str,
    *,
    weight: int,
) -> Backend:
    return Backend(
        id=identifier,
        name=identifier,
        url=f"http://{identifier}.test",
        weight=weight,
        status=BackendStatus.HEALTHY,
    )


@pytest.mark.asyncio
async def test_smooth_weighted_round_robin_distribution():
    algorithm = SmoothWeightedRoundRobin()

    backends = [
        create_backend("fast", weight=5),
        create_backend("slow", weight=2),
        create_backend("unstable", weight=1),
    ]

    selected_backend_ids = [
        (await algorithm.select(backends)).id
        for _ in range(80)
    ]

    counts = Counter(selected_backend_ids)

    assert counts == {
        "fast": 50,
        "slow": 20,
        "unstable": 10,
    }


@pytest.mark.asyncio
async def test_weighted_round_robin_excludes_removed_backend():
    algorithm = SmoothWeightedRoundRobin()

    initial_backends = [
        create_backend("fast", weight=5),
        create_backend("slow", weight=2),
    ]

    for _ in range(10):
        await algorithm.select(initial_backends)

    remaining_backends = [
        create_backend("fast", weight=5),
    ]

    selected = await algorithm.select(
        remaining_backends
    )

    assert selected.id == "fast"

    state = await algorithm.state()

    assert "slow" not in state


@pytest.mark.asyncio
async def test_weighted_round_robin_rejects_invalid_weight():
    algorithm = SmoothWeightedRoundRobin()

    invalid_backend = create_backend(
        "invalid",
        weight=0,
    )

    with pytest.raises(ValueError):
        await algorithm.select(
            [invalid_backend]
        )