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
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
