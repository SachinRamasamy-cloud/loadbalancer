from collections import Counter

import pytest

from app.domain.backend import Backend
from app.domain.enums import (
    AlgorithmName,
    BackendStatus,
)
from app.domain.errors import (
    NoHealthyBackendError,
)
from app.services.algorithms.least_inflight import (
    LeastInflight,
)
from app.services.algorithms.round_robin import (
    RoundRobin,
)
from app.services.algorithms.smooth_weighted import (
    SmoothWeightedRoundRobin,
)
from app.services.router import TrafficRouter


def backend(
    identifier: str,
    *,
    weight: int = 1,
    active: int = 0,
) -> Backend:
    return Backend(
        id=identifier,
        name=identifier,
        url=f"http://{identifier}.test",
        weight=weight,
        active_requests=active,
        status=BackendStatus.HEALTHY,
    )


class FakeRegistry:
    """
    Minimal registry used to verify atomic backend reservation.
    """

    def __init__(
        self,
        backends: list[Backend],
    ) -> None:
        self.backends = {
            item.id: item
            for item in backends
        }

    async def eligible(
        self,
        exclude: set[str] | None = None,
    ) -> list[Backend]:
        excluded = exclude or set()

        return [
            item
            for item in self.backends.values()
            if item.eligible
            and item.id not in excluded
        ]

    async def acquire(
        self,
        backend_id: str,
    ) -> Backend:
        selected = self.backends[backend_id]
        selected.active_requests += 1
        selected.total_requests += 1
        return selected


@pytest.mark.asyncio
async def test_round_robin_cycles_in_stable_order():
    algorithm = RoundRobin()

    values = [
        backend("b"),
        backend("a"),
        backend("c"),
    ]

    selected = [
        (await algorithm.select(values)).id
        for _ in range(5)
    ]

    assert selected == [
        "a",
        "b",
        "c",
        "a",
        "b",
    ]


@pytest.mark.asyncio
async def test_smooth_weighted_distribution():
    algorithm = SmoothWeightedRoundRobin()

    values = [
        backend("heavy", weight=3),
        backend("light", weight=1),
    ]

    selected = [
        (await algorithm.select(values)).id
        for _ in range(40)
    ]

    counts = Counter(selected)

    assert counts == {
        "heavy": 30,
        "light": 10,
    }


@pytest.mark.asyncio
async def test_least_inflight_selects_lowest_load():
    algorithm = LeastInflight()

    selected = await algorithm.select([
        backend("busy", active=8),
        backend("medium", active=3),
        backend("available", active=1),
    ])

    assert selected.id == "available"


@pytest.mark.asyncio
async def test_least_inflight_respects_capacity():
    algorithm = LeastInflight()

    selected = await algorithm.select([
        backend(
            "small",
            weight=1,
            active=2,
        ),
        backend(
            "large",
            weight=4,
            active=4,
        ),
    ])

    # small normalized load = 2 / 1 = 2
    # large normalized load = 4 / 4 = 1
    assert selected.id == "large"


@pytest.mark.asyncio
async def test_least_inflight_rotates_equal_loads():
    algorithm = LeastInflight()

    values = [
        backend("a", active=0),
        backend("b", active=0),
        backend("c", active=0),
    ]

    selected = [
        (await algorithm.select(values)).id
        for _ in range(6)
    ]

    assert selected == [
        "a",
        "b",
        "c",
        "a",
        "b",
        "c",
    ]


@pytest.mark.asyncio
async def test_least_inflight_rejects_invalid_weight():
    algorithm = LeastInflight()

    invalid = backend(
        "invalid",
        weight=0,
    )

    with pytest.raises(ValueError):
        await algorithm.select([invalid])


@pytest.mark.asyncio
async def test_least_inflight_without_backends():
    algorithm = LeastInflight()

    with pytest.raises(
        NoHealthyBackendError
    ):
        await algorithm.select([])


@pytest.mark.asyncio
async def test_router_reservation_updates_load_atomically():
    first = backend("first")
    second = backend("second")

    registry = FakeRegistry([
        first,
        second,
    ])

    router = TrafficRouter(
        registry=registry,  # type: ignore[arg-type]
        default_algorithm=(
            AlgorithmName.LEAST_INFLIGHT
        ),
    )

    reservation_one = await router.reserve()
    reservation_two = await router.reserve()

    assert reservation_one.id != reservation_two.id

    assert first.active_requests == 1
    assert second.active_requests == 1


@pytest.mark.asyncio
async def test_router_reservation_uses_capacity():
    small = backend(
        "small",
        weight=1,
        active=2,
    )

    large = backend(
        "large",
        weight=4,
        active=4,
    )

    registry = FakeRegistry([
        small,
        large,
    ])

    router = TrafficRouter(
        registry=registry,  # type: ignore[arg-type]
        default_algorithm=(
            AlgorithmName.LEAST_INFLIGHT
        ),
    )

    selected = await router.reserve()

    assert selected.id == "large"
    assert large.active_requests == 5