from app.domain.enums import AlgorithmName
from app.services.algorithms.least_inflight import LeastInflight
from app.services.algorithms.round_robin import RoundRobin
from app.services.algorithms.smooth_weighted import SmoothWeightedRoundRobin


class AlgorithmFactory:
    def __init__(self) -> None:
        self._instances = {
            AlgorithmName.ROUND_ROBIN: RoundRobin(),
            AlgorithmName.SMOOTH_WEIGHTED_ROUND_ROBIN: SmoothWeightedRoundRobin(),
            AlgorithmName.LEAST_INFLIGHT: LeastInflight(),
        }

    def get(self, name: AlgorithmName):
        return self._instances[name]
