from __future__ import annotations

import asyncio
from fractions import Fraction

from app.domain.backend import Backend
from app.domain.errors import NoHealthyBackendError


class LeastInflight:
    """
    Capacity-aware Least Connections algorithm.

    In an asynchronous HTTP proxy, a connection is represented by an
    in-flight request. The backend with the lowest normalized active load
    is selected.

    Normalized load:

        active_requests / weight

    Examples:

        Backend A:
            active_requests = 4
            weight = 1
            normalized_load = 4.0

        Backend B:
            active_requests = 6
            weight = 4
            normalized_load = 1.5

        Backend B is selected because it has lower relative utilization.

    If every backend has weight=1, the algorithm behaves as standard
    Least Connections.

    Equal-load backends use a rotating tie-breaker to prevent one backend
    from always winning because its ID sorts first.
    """

    def __init__(self) -> None:
        self._tie_cursor = 0
        self._lock = asyncio.Lock()

    async def select(
        self,
        backends: list[Backend],
    ) -> Backend:
        """
        Select the backend with the lowest capacity-normalized
        number of active requests.

        The caller must supply only healthy, enabled and non-excluded
        backends.
        """

        if not backends:
            raise NoHealthyBackendError(
                "No healthy backend is available"
            )

        invalid_backends = [
            backend.id
            for backend in backends
            if backend.weight < 1
        ]

        if invalid_backends:
            invalid_ids = ", ".join(invalid_backends)

            raise ValueError(
                "Backend weight must be at least 1. "
                f"Invalid backends: {invalid_ids}"
            )

        async with self._lock:
            normalized_loads = {
                backend.id: Fraction(
                    backend.active_requests,
                    backend.weight,
                )
                for backend in backends
            }

            minimum_load = min(
                normalized_loads.values()
            )

            tied_backends = sorted(
                (
                    backend
                    for backend in backends
                    if normalized_loads[backend.id]
                    == minimum_load
                ),
                key=lambda backend: backend.id,
            )

            selected_index = (
                self._tie_cursor
                % len(tied_backends)
            )

            selected = tied_backends[selected_index]

            self._tie_cursor = (
                self._tie_cursor + 1
            ) % max(1, len(tied_backends))

            return selected

    async def reset(self) -> None:
        """
        Reset the rotating tie-breaker.

        Useful for deterministic tests and configuration reloads.
        """

        async with self._lock:
            self._tie_cursor = 0

    async def score(
        self,
        backend: Backend,
    ) -> Fraction:
        """
        Return the normalized load score for diagnostics.

        Lower scores represent less utilized backends.
        """

        if backend.weight < 1:
            raise ValueError(
                "Backend weight must be at least 1"
            )

        return Fraction(
            backend.active_requests,
            backend.weight,
        )