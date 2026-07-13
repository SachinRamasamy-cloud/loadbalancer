from __future__ import annotations

import asyncio

from app.domain.backend import Backend, utc_now_iso
from app.domain.enums import BackendStatus
from app.domain.errors import BackendValidationError
from app.repositories import BackendRepository
from app.services.backend_validator import BackendURLValidator


class BackendRegistry:
    def __init__(
        self,
        validator: BackendURLValidator,
        repository: BackendRepository | None = None,
    ) -> None:
        self._items: dict[str, Backend] = {}
        self._lock = asyncio.Lock()
        self._validator = validator
        self._repository = repository

    async def hydrate(self) -> int:
        if self._repository is None:
            return 0
        items = await self._repository.list_backends()
        async with self._lock:
            self._items = {item.id: item for item in items}
        return len(items)

    async def seed(self, definitions: list[dict]) -> None:
        for item in definitions:
            backend = Backend(
                id=item["id"],
                name=item.get("name", item["id"]),
                url=item["url"],
                weight=int(item.get("weight", 1)),
            )
            async with self._lock:
                exists = backend.id in self._items
            if exists:
                continue
            await self.add(backend)

    async def add(self, backend: Backend) -> Backend:
        backend.url = self._validator.validate(backend.url)
        async with self._lock:
            if backend.id in self._items:
                raise BackendValidationError(f"Backend id already exists: {backend.id}")
            self._items[backend.id] = backend
        if self._repository is not None:
            try:
                await self._repository.upsert(backend)
            except Exception:
                async with self._lock:
                    self._items.pop(backend.id, None)
                raise
        return backend

    async def update(self, backend_id: str, **changes) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            original = Backend(**{
                "id": backend.id,
                "name": backend.name,
                "url": backend.url,
                "weight": backend.weight,
                "enabled": backend.enabled,
                "status": backend.status,
                "active_requests": backend.active_requests,
                "total_requests": backend.total_requests,
                "total_errors": backend.total_errors,
                "last_latency_ms": backend.last_latency_ms,
                "last_checked_at": backend.last_checked_at,
                "last_error": backend.last_error,
                "consecutive_successes": backend.consecutive_successes,
                "consecutive_failures": backend.consecutive_failures,
            })
            if "url" in changes and changes["url"] is not None:
                changes["url"] = self._validator.validate(str(changes["url"]))
            for key, value in changes.items():
                if value is not None:
                    setattr(backend, key, value)
        if self._repository is not None:
            try:
                await self._repository.upsert(backend)
            except Exception:
                async with self._lock:
                    self._items[backend_id] = original
                raise
        return backend

    async def remove(self, backend_id: str) -> None:
        async with self._lock:
            backend = self._require(backend_id)
        if self._repository is not None:
            await self._repository.soft_delete(backend_id)
        async with self._lock:
            self._items.pop(backend.id, None)

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
            old_enabled = backend.enabled
            old_status = backend.status
            backend.enabled = enabled
            backend.status = BackendStatus.UNKNOWN if enabled else BackendStatus.DISABLED
        if self._repository is not None:
            try:
                await self._repository.set_enabled(backend_id, enabled)
            except Exception:
                async with self._lock:
                    backend.enabled = old_enabled
                    backend.status = old_status
                raise
        return backend

    async def drain(self, backend_id: str) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            old_status = backend.status
            backend.status = BackendStatus.DRAINING
        if self._repository is not None:
            try:
                await self._repository.drain(backend_id)
            except Exception:
                async with self._lock:
                    backend.status = old_status
                raise
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

    async def record_health(
        self,
        backend_id: str,
        *,
        success: bool,
        latency_ms: float,
        error: str | None,
        healthy_threshold: int,
        unhealthy_threshold: int,
        status_code: int | None = None,
    ) -> Backend:
        async with self._lock:
            backend = self._require(backend_id)
            backend.last_checked_at = utc_now_iso()
            backend.last_latency_ms = latency_ms
            if not backend.enabled or backend.status == BackendStatus.DRAINING:
                result = backend
            elif success:
                backend.consecutive_successes += 1
                backend.consecutive_failures = 0
                backend.last_error = None
                if backend.consecutive_successes >= healthy_threshold:
                    backend.status = BackendStatus.HEALTHY
                result = backend
            else:
                backend.consecutive_failures += 1
                backend.consecutive_successes = 0
                backend.last_error = error
                if backend.consecutive_failures >= unhealthy_threshold:
                    backend.status = BackendStatus.UNHEALTHY
                result = backend

        if self._repository is not None:
            await self._repository.record_health(
                backend_id,
                success=success,
                latency_ms=latency_ms,
                status_code=status_code,
                error_type=None if success else "HealthCheckError",
                error_message=error,
                healthy_threshold=healthy_threshold,
                unhealthy_threshold=unhealthy_threshold,
            )
        return result

    def _require(self, backend_id: str) -> Backend:
        try:
            return self._items[backend_id]
        except KeyError as exc:
            raise KeyError(f"Backend not found: {backend_id}") from exc
