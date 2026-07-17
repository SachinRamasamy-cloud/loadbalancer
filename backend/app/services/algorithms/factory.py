from __future__ import annotations

from app.domain.enums import AlgorithmName
from app.services.algorithms.base import (
    LoadBalancingAlgorithm,
)
from app.services.algorithms.least_inflight import LeastInflight
from app.services.algorithms.round_robin import RoundRobin
from app.services.algorithms.smooth_weighted import (
    SmoothWeightedRoundRobin,
)


class AlgorithmFactory:
    """
    Creates and stores the load-balancing algorithm instances.

    Instances are retained because Round Robin and Smooth Weighted
    Round Robin maintain runtime selection state.
    """

    def __init__(self) -> None:
        self._instances: dict[
            AlgorithmName,
            LoadBalancingAlgorithm,
        ] = {
            AlgorithmName.ROUND_ROBIN: RoundRobin(),

            AlgorithmName.SMOOTH_WEIGHTED_ROUND_ROBIN:
                SmoothWeightedRoundRobin(),

            AlgorithmName.LEAST_INFLIGHT:
                LeastInflight(),
        }

    def get(
        self,
        name: AlgorithmName,
    ) -> LoadBalancingAlgorithm:
        try:
            return self._instances[name]
        except KeyError as exc:
            raise ValueError(
                f"Unsupported load-balancing algorithm: {name}"
            ) from exc