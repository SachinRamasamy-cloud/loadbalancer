# Database Integration Changes

- Added async SQLAlchemy and asyncpg connection management.
- Added Supabase direct, session-pooler, and transaction-pooler compatibility.
- Added database health reporting.
- Added backend hydration from Postgres at startup.
- Added persistent backend create, update, enable, disable, drain, and delete operations.
- Added persistent routing algorithm configuration.
- Added durable API history worker with `FOR UPDATE SKIP LOCKED` claiming.
- Added request and retry-attempt persistence.
- Added health-check persistence.
- Added security-event persistence.
- Added load-test run and sample persistence.
- Added database-backed dashboard history and analytics fallbacks.
- Preserved in-memory operation when no database URL is configured.
