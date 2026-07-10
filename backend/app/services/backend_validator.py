from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

from app.core.config import Settings
from app.domain.errors import BackendValidationError


class BackendURLValidator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate(self, raw_url: str) -> str:
        parsed = urlparse(raw_url)
        if parsed.scheme not in {"http", "https"}:
            raise BackendValidationError("Only http and https backend URLs are allowed")
        if not parsed.hostname:
            raise BackendValidationError("Backend URL requires a hostname")
        if parsed.username or parsed.password:
            raise BackendValidationError("Backend URL userinfo is not allowed")

        host = parsed.hostname.lower()
        if self.settings.allowed_backend_hosts and host not in self.settings.allowed_backend_hosts:
            raise BackendValidationError("Backend hostname is not in ALLOWED_BACKEND_HOSTS")

        if not self.settings.allow_private_backends:
            self._reject_private_destination(host)

        return raw_url.rstrip("/")

    @staticmethod
    def _reject_private_destination(host: str) -> None:
        try:
            addresses = {item[4][0] for item in socket.getaddrinfo(host, None)}
        except socket.gaierror as exc:
            raise BackendValidationError(f"Backend hostname cannot be resolved: {host}") from exc

        for address in addresses:
            ip = ipaddress.ip_address(address)
            if any((ip.is_private, ip.is_loopback, ip.is_link_local, ip.is_multicast, ip.is_reserved)):
                raise BackendValidationError("Private, loopback, link-local, or reserved backends are blocked")
