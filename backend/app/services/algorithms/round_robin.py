import asyncio

from app.domain.backend import Backend
from app.domain.errors import NoHealthyBackendError


class RoundRobin:
    def __init__(self) -> None:
        self._index = 0
        self._lock = asyncio.Lock()

    async def select(self, backends: list[Backend]) -> Backend:
        if not backends:
            raise NoHealthyBackendError("No healthy backend is available")
        ordered = sorted(backends, key=lambda item: item.id)
        async with self._lock:
            selected = ordered[self._index % len(ordered)]
            self._index = (self._index + 1) % max(1, len(ordered))
            return selected
