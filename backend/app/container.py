from __future__ import annotations

import httpx

from app.core.config import Settings
from app.domain.enums import AlgorithmName
from app.services.backend_validator import BackendURLValidator
from app.services.health import HealthChecker
from app.services.metrics import MetricsStore
from app.services.proxy import ProxyService
from app.services.rate_limit import FixedWindowRateLimiter
from app.services.registry import BackendRegistry
from app.services.router import TrafficRouter
from app.services.security_store import SecurityStore
from app.services.load_tester import LoadTester


class Container:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.settings = settings
        timeout = httpx.Timeout(
            timeout=settings.request_timeout_seconds,
            connect=settings.connect_timeout_seconds,
        )
        self.http_client = httpx.AsyncClient(timeout=timeout, transport=transport, follow_redirects=False)
        self.registry = BackendRegistry(BackendURLValidator(settings))
        self.metrics = MetricsStore()
        self.router = TrafficRouter(self.registry, AlgorithmName(settings.algorithm))
        self.rate_limiter = FixedWindowRateLimiter(
            settings.rate_limit_requests,
            settings.rate_limit_window_seconds,
        )
        self.security_store = SecurityStore()
        self.load_tester = LoadTester()
        self.proxy = ProxyService(
            client=self.http_client,
            registry=self.registry,
            router=self.router,
            metrics=self.metrics,
            settings=settings,
        )
        self.health = HealthChecker(self.registry, self.http_client, settings)
