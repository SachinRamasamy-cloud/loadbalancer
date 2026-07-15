from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache


@dataclass(slots=True)
class Settings:
    admin_api_key: str = "change-me"
    log_level: str = "INFO"
    algorithm: str = "round_robin"
    request_timeout_seconds: float = 15.0
    connect_timeout_seconds: float = 3.0
    health_check_enabled: bool = True
    health_check_interval_seconds: float = 5.0
    healthy_threshold: int = 2
    unhealthy_threshold: int = 3
    max_request_body_bytes: int = 10 * 1024 * 1024
    rate_limit_requests: int = 300
    rate_limit_window_seconds: int = 60
    allow_private_backends: bool = False
    allowed_backend_hosts: tuple[str, ...] = field(default_factory=tuple)
    expose_selected_backend_header: bool = False
    cors_origins: tuple[str, ...] = ("http://localhost:4200",)
    seed_backends: list[dict] = field(default_factory=list)

    database_url_runtime: str | None = None
    database_required: bool = False
    database_transaction_pooler: bool = False
    database_application_name: str = "loadflow-api"
    db_pool_size: int = 3
    db_max_overflow: int = 2
    db_pool_timeout_seconds: float = 10.0
    db_pool_recycle_seconds: int = 600

    telemetry_queue_max_size: int = 10000
    telemetry_batch_size: int = 250
    telemetry_flush_interval_ms: int = 500
    telemetry_lock_timeout_seconds: int = 300

    load_test_target_url: str = "http://localhost:8080/api/demo"

    live_api_events_enabled: bool = True
    live_api_event_history_size: int = 10000
    live_api_subscriber_queue_size: int = 10000
    live_api_keepalive_seconds: int = 15

    @classmethod
    def from_env(cls) -> "Settings":
        def bool_env(name: str, default: bool) -> bool:
            raw = os.getenv(name)
            return default if raw is None else raw.strip().lower() in {"1", "true", "yes", "on"}

        def tuple_env(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
            raw = os.getenv(name)
            if not raw:
                return default
            return tuple(part.strip() for part in raw.split(",") if part.strip())

        seed_raw = os.getenv("SEED_BACKENDS_JSON", "[]")
        try:
            seed = json.loads(seed_raw)
            if not isinstance(seed, list):
                raise ValueError("SEED_BACKENDS_JSON must be a JSON list")
        except (json.JSONDecodeError, ValueError) as exc:
            raise RuntimeError(f"Invalid SEED_BACKENDS_JSON: {exc}") from exc

        database_url = os.getenv("DATABASE_URL_RUNTIME") or os.getenv("DATABASE_URL")

        return cls(
            admin_api_key=os.getenv("ADMIN_API_KEY", "change-me"),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            algorithm=os.getenv("ALGORITHM", "round_robin"),
            request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "15")),
            connect_timeout_seconds=float(os.getenv("CONNECT_TIMEOUT_SECONDS", "3")),
            health_check_enabled=bool_env("HEALTH_CHECK_ENABLED", True),
            health_check_interval_seconds=float(os.getenv("HEALTH_CHECK_INTERVAL_SECONDS", "5")),
            healthy_threshold=int(os.getenv("HEALTHY_THRESHOLD", "2")),
            unhealthy_threshold=int(os.getenv("UNHEALTHY_THRESHOLD", "3")),
            max_request_body_bytes=int(os.getenv("MAX_REQUEST_BODY_BYTES", str(10 * 1024 * 1024))),
            rate_limit_requests=int(os.getenv("RATE_LIMIT_REQUESTS", "300")),
            rate_limit_window_seconds=int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")),
            allow_private_backends=bool_env("ALLOW_PRIVATE_BACKENDS", False),
            allowed_backend_hosts=tuple_env("ALLOWED_BACKEND_HOSTS", ()),
            expose_selected_backend_header=bool_env("EXPOSE_SELECTED_BACKEND_HEADER", False),
            cors_origins=tuple_env("CORS_ORIGINS", ("http://localhost:4200",)),
            seed_backends=seed,
            database_url_runtime=database_url,
            database_required=bool_env("DATABASE_REQUIRED", False),
            database_transaction_pooler=bool_env("DATABASE_TRANSACTION_POOLER", False),
            database_application_name=os.getenv("DATABASE_APPLICATION_NAME", "loadflow-api"),
            db_pool_size=int(os.getenv("DB_POOL_SIZE", "3")),
            db_max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "2")),
            db_pool_timeout_seconds=float(os.getenv("DB_POOL_TIMEOUT_SECONDS", "10")),
            db_pool_recycle_seconds=int(os.getenv("DB_POOL_RECYCLE_SECONDS", "600")),
            telemetry_queue_max_size=int(os.getenv("TELEMETRY_QUEUE_MAX_SIZE", "10000")),
            telemetry_batch_size=int(os.getenv("TELEMETRY_BATCH_SIZE", "250")),
            telemetry_flush_interval_ms=int(os.getenv("TELEMETRY_FLUSH_INTERVAL_MS", "500")),
            telemetry_lock_timeout_seconds=int(os.getenv("TELEMETRY_LOCK_TIMEOUT_SECONDS", "300")),
            load_test_target_url=os.getenv("LOAD_TEST_TARGET_URL", "http://localhost:8080/api/demo"),
            live_api_events_enabled=bool_env("LIVE_API_EVENTS_ENABLED", True),
            live_api_event_history_size=int(os.getenv("LIVE_API_EVENT_HISTORY_SIZE", "10000")),
            live_api_subscriber_queue_size=int(os.getenv("LIVE_API_SUBSCRIBER_QUEUE_SIZE", "10000")),
            live_api_keepalive_seconds=int(os.getenv("LIVE_API_KEEPALIVE_SECONDS", "15")),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
