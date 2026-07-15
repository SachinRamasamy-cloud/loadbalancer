from __future__ import annotations

import httpx

from app.core.config import Settings
from app.db import Database
from app.domain.enums import AlgorithmName
from app.repositories import (
    ApiHistoryRepository,
    BackendRepository,
    DashboardRepository,
    LoadTestRepository,
    RoutingRepository,
    SecurityRepository,
)
from app.services.api_history_worker import ApiHistoryWorker
from app.services.backend_validator import BackendURLValidator
from app.services.health import HealthChecker
from app.services.load_tester import LoadTester
from app.services.live_api_events import LiveApiEventHub
from app.services.metrics import MetricsStore
from app.services.proxy import ProxyService
from app.services.rate_limit import FixedWindowRateLimiter
from app.services.registry import BackendRegistry
from app.services.router import TrafficRouter
from app.services.security_store import SecurityStore


class Container:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.settings = settings
        timeout = httpx.Timeout(
            timeout=settings.request_timeout_seconds,
            connect=settings.connect_timeout_seconds,
        )
        self.http_client = httpx.AsyncClient(
            timeout=timeout,
            transport=transport,
            follow_redirects=False,
        )

        self.live_api_events = LiveApiEventHub(
            enabled=settings.live_api_events_enabled,
            history_size=settings.live_api_event_history_size,
            subscriber_queue_size=settings.live_api_subscriber_queue_size,
        )

        self.database = Database(settings)
        self.backend_repository = BackendRepository(self.database)
        self.routing_repository = RoutingRepository(self.database)
        self.history_repository = ApiHistoryRepository(self.database)
        self.dashboard_repository = DashboardRepository(self.database)
        self.security_repository = SecurityRepository(self.database)
        self.load_test_repository = LoadTestRepository(self.database)

        self.registry = BackendRegistry(
            BackendURLValidator(settings),
            repository=self.backend_repository,
        )
        self.router = TrafficRouter(
            self.registry,
            AlgorithmName(settings.algorithm),
            repository=self.routing_repository,
        )
        self.metrics = MetricsStore(
            dashboard_repository=self.dashboard_repository,
            history_repository=self.history_repository,
        )
        self.api_history_worker = ApiHistoryWorker(
            self.history_repository,
            settings,
            event_hub=self.live_api_events,
        )
        self.rate_limiter = FixedWindowRateLimiter(
            settings.rate_limit_requests,
            settings.rate_limit_window_seconds,
        )
        self.security_store = SecurityStore(self.security_repository)
        self.load_tester = LoadTester(
            target_url=settings.load_test_target_url,
            repository=self.load_test_repository,
            algorithm_provider=lambda: self.router.algorithm_name,
        )
        self.proxy = ProxyService(
            client=self.http_client,
            registry=self.registry,
            router=self.router,
            metrics=self.metrics,
            settings=settings,
            history_worker=self.api_history_worker,
            event_hub=self.live_api_events,
        )
        self.health = HealthChecker(self.registry, self.http_client, settings)
