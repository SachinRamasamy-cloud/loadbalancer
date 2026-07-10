class LoadBalancerError(Exception):
    pass


class NoHealthyBackendError(LoadBalancerError):
    pass


class BackendValidationError(LoadBalancerError):
    pass


class RequestBodyTooLargeError(LoadBalancerError):
    pass
