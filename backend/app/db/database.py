from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings

logger = logging.getLogger(__name__)


class Database:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.engine: AsyncEngine | None = None
        self.session_factory: async_sessionmaker[AsyncSession] | None = None
        self.last_error: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.settings.database_url_runtime)

    @property
    def available(self) -> bool:
        return self.engine is not None and self.session_factory is not None

    async def start(self) -> None:
        if not self.enabled:
            return

        url = self.settings.database_url_runtime
        assert url is not None
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]

        parsed = make_url(url)
        query = dict(parsed.query)
        sslmode = query.pop("sslmode", None)
        if sslmode and "ssl" not in query:
            query["ssl"] = sslmode

        connect_args: dict = {
            "server_settings": {"application_name": self.settings.database_application_name}
        }
        if self.settings.database_transaction_pooler or parsed.port == 6543:
            query["prepared_statement_cache_size"] = "0"
            connect_args["statement_cache_size"] = 0

        parsed = parsed.set(query=query)

        self.engine = create_async_engine(
            parsed,
            pool_size=self.settings.db_pool_size,
            max_overflow=self.settings.db_max_overflow,
            pool_timeout=self.settings.db_pool_timeout_seconds,
            pool_recycle=self.settings.db_pool_recycle_seconds,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

        try:
            async with self.engine.connect() as connection:
                await connection.execute(text("select 1"))
            self.last_error = None
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {exc}"
            await self.close()
            if self.settings.database_required:
                raise
            logger.exception("Database unavailable; continuing with in-memory fallback")

    async def close(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()
        self.engine = None
        self.session_factory = None

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        if self.session_factory is None:
            raise RuntimeError("Database is not available")
        async with self.session_factory() as session:
            yield session

    async def health(self) -> dict:
        if not self.enabled:
            return {"enabled": False, "available": False, "status": "disabled"}
        if not self.available:
            return {
                "enabled": True,
                "available": False,
                "status": "degraded",
                "error": self.last_error,
            }
        try:
            async with self.engine.connect() as connection:  # type: ignore[union-attr]
                await connection.execute(text("select 1"))
            self.last_error = None
            return {"enabled": True, "available": True, "status": "ok"}
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {exc}"
            return {
                "enabled": True,
                "available": False,
                "status": "degraded",
                "error": self.last_error,
            }
