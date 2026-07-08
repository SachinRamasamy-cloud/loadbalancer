from app.domain.backend import Backend
from app.domain.errors import NoHealthyBackendError


class LeastInflight:
    async def select(self, backends: list[Backend]) -> Backend:
        if not backends:
            raise NoHealthyBackendError("No healthy backend is available")
        return min(
            backends,
            key=lambda item: (
                item.active_requests / max(item.weight, 1),
                item.last_latency_ms if item.last_latency_ms is not None else 0,
                item.id,
            ),
        )
