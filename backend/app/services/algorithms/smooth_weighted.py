from __future__ import annotations

import asyncio

from app.domain.backend import Backend
from app.domain.errors import NoHealthyBackendError


class SmoothWeightedRoundRobin:
    """
    Concurrent-safe Smooth Weighted Round Robin implementation.

    For every selection:

    1. Add each backend's configured weight to its current score.
    2. Select the backend with the highest score.
    3. Subtract the total weight from the selected backend's score.

    Example weights:
        backend-fast = 5
        backend-slow = 2
        backend-unstable = 1

    Expected long-term distribution:
        backend-fast = 62.5%
        backend-slow = 25%
        backend-unstable = 12.5%
    """

    def __init__(self) -> None:
        # Runtime scheduling score for each backend.
        self._current_weights: dict[str, int] = {}

        # Prevent multiple concurrent requests from modifying scheduling
        # state at the same time.
        self._lock = asyncio.Lock()

    async def select(self, backends: list[Backend]) -> Backend:
        """
        Select one backend using Smooth Weighted Round Robin.

        The supplied list should already contain only enabled and healthy
        backends. BackendRegistry.eligible() handles that filtering.
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
                f"Backend weights must be at least 1: {invalid_ids}"
            )

        async with self._lock:
            active_backend_ids = {
                backend.id for backend in backends
            }

            # Remove scheduling state for backends that are no longer
            # healthy, enabled, or registered.
            self._current_weights = {
                backend_id: current_weight
                for backend_id, current_weight
                in self._current_weights.items()
                if backend_id in active_backend_ids
            }

            total_weight = sum(
                backend.weight for backend in backends
            )

            selected_backend: Backend | None = None
            highest_current_weight: int | None = None

            # Sorting makes tie-breaking deterministic.
            for backend in sorted(
                backends,
                key=lambda item: item.id,
            ):
                previous_current_weight = (
                    self._current_weights.get(backend.id, 0)
                )

                new_current_weight = (
                    previous_current_weight + backend.weight
                )

                self._current_weights[backend.id] = (
                    new_current_weight
                )

                if (
                    selected_backend is None
                    or highest_current_weight is None
                    or new_current_weight > highest_current_weight
                ):
                    selected_backend = backend
                    highest_current_weight = new_current_weight

            if selected_backend is None:
                raise NoHealthyBackendError(
                    "Unable to select a healthy backend"
                )

            self._current_weights[selected_backend.id] -= (
                total_weight
            )

            return selected_backend

    async def reset(self) -> None:
        """
        Clear all runtime scheduling state.

        This can be useful during testing or configuration reloads.
        """

        async with self._lock:
            self._current_weights.clear()

    async def state(self) -> dict[str, int]:
        """
        Return a copy of the current scheduler state.

        Intended for diagnostics and testing.
        """

        async with self._lock:
            return dict(self._current_weights)