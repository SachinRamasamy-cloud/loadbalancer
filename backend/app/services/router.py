from __future__ import annotations

import asyncio

from app.domain.backend import Backend
from app.domain.enums import AlgorithmName
from app.domain.errors import (
    BackendValidationError,
    NoHealthyBackendError,
)
from app.repositories import RoutingRepository
from app.services.algorithms.base import (
    LoadBalancingAlgorithm,
)
from app.services.algorithms.factory import (
    AlgorithmFactory,
)
from app.services.registry import BackendRegistry


class TrafficRouter:
    """
    Coordinates routing-algorithm execution and backend reservation.

    A backend reservation includes:

        1. Reading eligible backends.
        2. Selecting a backend.
        3. Incrementing its active request count.

    These operations are serialized to prevent concurrent requests from
    selecting the same stale active-request state.
    """

    def __init__(
        self,
        registry: BackendRegistry,
        default_algorithm: AlgorithmName,
        repository: RoutingRepository | None = None,
    ) -> None:
        self.registry = registry
        self._algorithm_name = default_algorithm
        self._factory = AlgorithmFactory()
        self._repository = repository

        # Protects algorithm configuration changes.
        self._state_lock = asyncio.Lock()

        # Protects selection + active request increment.
        self._reservation_lock = asyncio.Lock()

    @property
    def algorithm_name(self) -> AlgorithmName:
        return self._algorithm_name

    async def hydrate(self) -> None:
        """
        Load the persisted routing algorithm from Supabase.

        The database value takes precedence over the environment
        configuration.
        """

        if self._repository is None:
            return

        saved_algorithm = (
            await self._repository.get_algorithm()
        )

        if saved_algorithm is None:
            return

        try:
            algorithm_name = AlgorithmName(
                saved_algorithm
            )
        except ValueError as exc:
            raise ValueError(
                "Supabase contains an unsupported routing "
                f"algorithm: {saved_algorithm}"
            ) from exc

        async with self._state_lock:
            self._algorithm_name = algorithm_name

    async def set_algorithm(
        self,
        name: AlgorithmName,
    ) -> None:
        """
        Persist and activate a routing algorithm.
        """

        if self._repository is not None:
            await self._repository.set_algorithm(
                name.value
            )

        async with self._state_lock:
            self._algorithm_name = name

    async def _current_algorithm(
        self,
    ) -> tuple[
        AlgorithmName,
        LoadBalancingAlgorithm,
    ]:
        async with self._state_lock:
            name = self._algorithm_name

        return name, self._factory.get(name)

    async def select(
        self,
        exclude: set[str] | None = None,
    ) -> Backend:
        """
        Select a backend without reserving it.

        This method is useful for diagnostics and algorithm tests.

        Proxy traffic should use reserve(), because reserve() performs
        selection and active-request increment atomically.
        """

        eligible = await self.registry.eligible(
            exclude
        )

        _, algorithm = await self._current_algorithm()

        return await algorithm.select(eligible)

    async def reserve(
        self,
        exclude: set[str] | None = None,
    ) -> Backend:
        """
        Atomically select and reserve a backend.

        The selected backend's active_requests counter is incremented
        before another request can perform a routing decision.

        If a backend becomes unhealthy between eligibility checking and
        acquisition, it is excluded and selection is retried.
        """

        excluded = set(exclude or set())

        async with self._reservation_lock:
            while True:
                eligible = await self.registry.eligible(
                    excluded
                )

                if not eligible:
                    raise NoHealthyBackendError(
                        "No healthy backend is available"
                    )

                _, algorithm = (
                    await self._current_algorithm()
                )

                selected = await algorithm.select(
                    eligible
                )

                try:
                    # acquire() increments:
                    # - active_requests
                    # - total_requests
                    return await self.registry.acquire(
                        selected.id
                    )

                except BackendValidationError:
                    # The health checker or administrator may have
                    # disabled the backend after the eligible list
                    # was read.
                    excluded.add(selected.id)