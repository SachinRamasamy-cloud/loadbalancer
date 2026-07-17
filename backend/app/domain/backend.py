from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from app.domain.enums import BackendStatus


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class Backend:
    id: str
    name: str
    url: str

    # Static capacity weight used by Weighted Round Robin.
    weight: int = 1

    enabled: bool = True
    status: BackendStatus = BackendStatus.UNKNOWN

    active_requests: int = 0
    total_requests: int = 0
    total_errors: int = 0

    last_latency_ms: float | None = None
    last_checked_at: str | None = None
    last_error: str | None = None

    consecutive_successes: int = 0
    consecutive_failures: int = 0

    @property
    def eligible(self) -> bool:
        return (
            self.enabled
            and self.status
            in {
                BackendStatus.HEALTHY,
                BackendStatus.UNKNOWN,
            }
        )

    def to_dict(self) -> dict:
        data = asdict(self)

        data["status"] = self.status.value
        data["eligible"] = self.eligible

        if self.total_requests:
            error_rate = (
                self.total_errors
                / self.total_requests
                * 100
            )
        else:
            error_rate = 0.0

        data["error_rate"] = round(
            error_rate,
            2,
        )

        return data