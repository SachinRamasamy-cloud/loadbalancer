from __future__ import annotations

from typing import Protocol

from app.domain.backend import Backend


class LoadBalancingAlgorithm(Protocol):
    async def select(self, backends: list[Backend]) -> Backend:
        ...
