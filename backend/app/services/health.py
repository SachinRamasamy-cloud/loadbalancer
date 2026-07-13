from __future__ import annotations

import asyncio
import logging
import time

import httpx

from app.core.config import Settings
from app.services.registry import BackendRegistry

logger = logging.getLogger(__name__)


class HealthChecker:
    def __init__(self, registry: BackendRegistry, client: httpx.AsyncClient, settings: Settings) -> None:
        self.registry = registry
        self.client = client
        self.settings = settings
        self._stop = asyncio.Event()

    async def run(self) -> None:
        while not self._stop.is_set():
            await self.check_all()
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.settings.health_check_interval_seconds)
            except TimeoutError:
                pass

    def stop(self) -> None:
        self._stop.set()

    async def check_all(self) -> None:
        backends = await self.registry.list()
        await asyncio.gather(*(self._check(item.id, item.url) for item in backends), return_exceptions=True)

    async def _check(self, backend_id: str, url: str) -> None:
        started = time.perf_counter()
        success = False
        status_code: int | None = None
        error: str | None = None
        try:
            response = await self.client.get(f"{url}/health", timeout=self.settings.connect_timeout_seconds)
            status_code = response.status_code
            success = 200 <= response.status_code < 400
            if not success:
                error = f"Health endpoint returned {response.status_code}"
        except Exception as exc:  # health loop must survive all backend failures
            error = f"{type(exc).__name__}: {exc}"
        latency_ms = (time.perf_counter() - started) * 1000
        try:
            await self.registry.record_health(
                backend_id,
                success=success,
                latency_ms=latency_ms,
                error=error,
                healthy_threshold=self.settings.healthy_threshold,
                unhealthy_threshold=self.settings.unhealthy_threshold,
                status_code=status_code,
            )
        except KeyError:
            logger.debug("Backend removed during health check: %s", backend_id)
