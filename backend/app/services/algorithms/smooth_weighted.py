import asyncio

from app.domain.backend import Backend
from app.domain.errors import NoHealthyBackendError


class SmoothWeightedRoundRobin:
    def __init__(self) -> None:
        self._current: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def select(self, backends: list[Backend]) -> Backend:
        if not backends:
            raise NoHealthyBackendError("No healthy backend is available")
        async with self._lock:
            active_ids = {backend.id for backend in backends}
            self._current = {key: value for key, value in self._current.items() if key in active_ids}
            total_weight = sum(backend.weight for backend in backends)
            selected: Backend | None = None
            selected_score: int | None = None
            for backend in sorted(backends, key=lambda item: item.id):
                score = self._current.get(backend.id, 0) + backend.weight
                self._current[backend.id] = score
                if selected is None or score > selected_score:
                    selected = backend
                    selected_score = score
            assert selected is not None
            self._current[selected.id] -= total_weight
            return selected
