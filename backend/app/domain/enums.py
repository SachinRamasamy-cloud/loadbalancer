from enum import StrEnum


class BackendStatus(StrEnum):
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DRAINING = "draining"
    DISABLED = "disabled"


class AlgorithmName(StrEnum):
    ROUND_ROBIN = "round_robin"

    SMOOTH_WEIGHTED_ROUND_ROBIN = (
        "smooth_weighted_round_robin"
    )

    LEAST_INFLIGHT = "least_inflight"