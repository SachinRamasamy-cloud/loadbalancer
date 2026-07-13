from __future__ import annotations

import asyncio

from app.domain.backend import Backend
from app.domain.enums import AlgorithmName
from app.repositories import RoutingRepository
from app.services.algorithms.factory import AlgorithmFactory
from app.services.registry import BackendRegistry


class TrafficRouter:
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
        if self._repository is None:
            return
        value = await self._repository.get_algorithm()
        if value is not None:
            self._algorithm_name = AlgorithmName(value)

    async def set_algorithm(self, name: AlgorithmName) -> None:
        if self._repository is not None:
            await self._repository.set_algorithm(name.value)
        async with self._lock:
            self._algorithm_name = name

    async def select(self, exclude: set[str] | None = None) -> Backend:
        eligible = await self.registry.eligible(exclude)
        algorithm = self._factory.get(self._algorithm_name)
        return await algorithm.select(eligible)
