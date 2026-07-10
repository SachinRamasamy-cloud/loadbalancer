from __future__ import annotations

import asyncio
from dataclasses import replace

from app.domain.backend import Backend, utc_now_iso
from app.domain.enums import BackendStatus
from app.domain.errors import BackendValidationError
from app.services.backend_validator import BackendURLValidator


class BackendRegistry:
    def __init__(self, validator: BackendURLValidator) -> None:
        self._items: dict[str, Backend] = {}
        self._lock = asyncio.Lock()
        self._validator = validator

    async def seed(self, definitions: list[dict]) -> None:
        for item in definitions:
            await self.add(
                Backend(
                    id=item["id"],
                    name=item.get("name", item["id"]),
                    url=item["url"],
                    weight=int(item.get("weight", 1)),
                )
            )

    async def add(self, backend: Backend) -> Backend:
        backend.url = self._validator.validate(backend.url)
        async with self._lock:
            if backend.id in self._items:
                raise BackendValidationError(f"Backend id already exists: {backend.id}")
            self._items[backend.id] = backend
            return backend

    async def update(self, backend_id: str, **changes) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            if "url" in changes and changes["url"] is not None:
                changes["url"] = self._validator.validate(str(changes["url"]))
            for key, value in changes.items():
                if value is not None:
                    setattr(backend, key, value)
            return backend

    async def remove(self, backend_id: str) -> None:
        async with self._lock:
            self._require(backend_id)
            del self._items[backend_id]

    async def list(self) -> list[Backend]:
        async with self._lock:
            return list(self._items.values())

    async def eligible(self, exclude: set[str] | None = None) -> list[Backend]:
        exclude = exclude or set()
        async with self._lock:
            return [item for item in self._items.values() if item.eligible and item.id not in exclude]

    async def get(self, backend_id: str) -> Backend:
        async with self._lock:
            return self._require(backend_id)

    async def set_enabled(self, backend_id: str, enabled: bool) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            backend.enabled = enabled
            backend.status = BackendStatus.UNKNOWN if enabled else BackendStatus.DISABLED
            return backend

    async def drain(self, backend_id: str) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            backend.status = BackendStatus.DRAINING
            return backend

    async def acquire(self, backend_id: str) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            if not backend.eligible:
                raise BackendValidationError(f"Backend is no longer eligible: {backend_id}")
            backend.active_requests += 1
            backend.total_requests += 1
            return backend

    async def release(self, backend_id: str, *, error: bool, latency_ms: float | None = None) -> None:
        async with self._lock:
            backend = self._items.get(backend_id)
            if not backend:
                return
            backend.active_requests = max(0, backend.active_requests - 1)
            if error:
                backend.total_errors += 1
            if latency_ms is not None:
                backend.last_latency_ms = latency_ms

    async def record_health(self, backend_id: str, *, success: bool, latency_ms: float, error: str | None,
                            healthy_threshold: int, unhealthy_threshold: int) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            backend.last_checked_at = utc_now_iso()
            backend.last_latency_ms = latency_ms
            if not backend.enabled or backend.status == BackendStatus.DRAINING:
                return backend
            if success:
                backend.consecutive_successes += 1
                backend.consecutive_failures = 0
                backend.last_error = None
                if backend.consecutive_successes >= healthy_threshold:
                    backend.status = BackendStatus.HEALTHY
            else:
                backend.consecutive_failures += 1
                backend.consecutive_successes = 0
                backend.last_error = error
                if backend.consecutive_failures >= unhealthy_threshold:
                    backend.status = BackendStatus.UNHEALTHY
            return backend

    def _require(self, backend_id: str) -> Backend:
        try:
            return self._items[backend_id]
        except KeyError as exc:
            raise KeyError(f"Backend not found: {backend_id}") from exc
