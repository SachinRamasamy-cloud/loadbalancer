from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import dataclass

from app.repositories import SecurityRepository


@dataclass(slots=True)
class SecurityEvent:
    title: str
    ip: str
    icon: str
    color: str
    background: str
    timestamp: float


class SecurityStore:
    def __init__(self, repository: SecurityRepository | None = None) -> None:
        self.lock = asyncio.Lock()
        self.events: deque[SecurityEvent] = deque(maxlen=100)
        self.rate_limit_hits = 0
        self.auth_failures = 0
        self.suspicious_events = 0
        self.blocked_ips: dict[str, int] = {}
        self.repository = repository

    async def record_rate_limit(self, ip: str) -> None:
        async with self.lock:
            self.rate_limit_hits += 1
            self.blocked_ips[ip] = self.blocked_ips.get(ip, 0) + 1
            self.events.append(SecurityEvent(
                title="Rate limit exceeded", ip=ip, icon="clock",
                color="#ef3f55", background="#fff0f2", timestamp=time.time()
            ))
        if self.repository is not None:
            await self.repository.record(
                "rate_limit_exceeded", "Rate limit exceeded", ip, blocked=True
            )

    async def record_auth_failure(self, ip: str) -> None:
        async with self.lock:
            self.auth_failures += 1
            self.blocked_ips[ip] = self.blocked_ips.get(ip, 0) + 1
            self.events.append(SecurityEvent(
                title="Auth failure (invalid API key)", ip=ip, icon="lock",
                color="#f97316", background="#fff5eb", timestamp=time.time()
            ))
        if self.repository is not None:
            await self.repository.record(
                "auth_failure", "Auth failure (invalid API key)", ip
            )

    async def record_suspicious_event(self, title: str, ip: str, icon: str = "shield") -> None:
        async with self.lock:
            self.suspicious_events += 1
            self.blocked_ips[ip] = self.blocked_ips.get(ip, 0) + 1
            self.events.append(SecurityEvent(
                title=title, ip=ip, icon=icon,
                color="#ef3f55", background="#fff0f2", timestamp=time.time()
            ))
        if self.repository is not None:
            event_type = "sql_injection_detected" if "SQL injection" in title else "suspicious_request"
            await self.repository.record(event_type, title, ip, severity="error", blocked=True)

    async def get_stats(self) -> dict:
        async with self.lock:
            blocked_ips_list = []
            max_hits = max(self.blocked_ips.values()) if self.blocked_ips else 1
            for ip, hits in sorted(self.blocked_ips.items(), key=lambda x: x[1], reverse=True)[:5]:
                blocked_ips_list.append({
                    "address": ip,
                    "hits": hits,
                    "progress": int((hits / max_hits) * 100),
                })

            if not blocked_ips_list:
                blocked_ips_list = [{"address": "200.0.113.45", "hits": 0, "progress": 0}]

            recent_events = [
                {
                    "title": ev.title,
                    "ip": ev.ip,
                    "icon": ev.icon,
                    "color": ev.color,
                    "background": ev.background,
                }
                for ev in list(self.events)[::-1]
            ]
            if not recent_events:
                recent_events = [{
                    "title": "Security monitor started",
                    "ip": "127.0.0.1",
                    "icon": "shield",
                    "color": "#16b8b0",
                    "background": "#eafbf9",
                }]

            return {
                "blocked_ips_count": len(self.blocked_ips),
                "rate_limit_hits": self.rate_limit_hits,
                "auth_failures": self.auth_failures,
                "suspicious_events": self.suspicious_events,
                "blocked_ips": blocked_ips_list,
                "events": recent_events,
            }
