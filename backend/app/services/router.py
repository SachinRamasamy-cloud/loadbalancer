from __future__ import annotations

import asyncio

from app.domain.backend import Backend
from app.domain.enums import AlgorithmName
from app.repositories import RoutingRepository
from app.services.algorithms.factory import AlgorithmFactory
from app.services.registry import BackendRegistry


class TrafficRouter:
    """
    Selects eligible backends using the currently configured
    load-balancing algorithm.
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
        self._lock = asyncio.Lock()
        self._repository = repository

    @property
    def algorithm_name(self) -> AlgorithmName:
        return self._algorithm_name

    async def hydrate(self) -> None:
        """
        Load the persisted routing algorithm from Supabase.

        When a database algorithm exists, it takes precedence over
        the ALGORITHM value from the environment file.
        """

        if self._repository is None:
            return

        saved_algorithm = (
            await self._repository.get_algorithm()
        )

        if saved_algorithm is not None:
            self._algorithm_name = AlgorithmName(
                saved_algorithm
            )

    async def set_algorithm(
        self,
        name: AlgorithmName,
    ) -> None:
        """
        Persist and activate a new routing algorithm.
        """

        if self._repository is not None:
            await self._repository.set_algorithm(name.value)

        async with self._lock:
            self._algorithm_name = name

    async def select(
        self,
        exclude: set[str] | None = None,
    ) -> Backend:
        """
        Select one healthy backend.

        Backends included in `exclude` are ignored. This is used by
        retry and failover handling so the same failed backend is not
        immediately selected again.
        """

        eligible_backends = await self.registry.eligible(
            exclude
        )

        algorithm = self._factory.get(
            self._algorithm_name
        )

        return await algorithm.select(
            eligible_backends
        )