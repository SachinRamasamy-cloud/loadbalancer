# 4. Connection Pool Design

## Why two pool layers may exist

LoadFlow can have:

1. An application-side SQLAlchemy pool
2. A Supabase server-side pooler

The application pool reduces connection setup overhead. The server-side pooler protects Postgres from excessive client connections.

## Initial recommendation

For one small persistent FastAPI replica:

```text
pool_size = 3
max_overflow = 2
pool_timeout = 10 seconds
pool_recycle = 300–900 seconds
pool_pre_ping = enabled
```

This is a conservative starting point, not a universal final value.

## Capacity formula

For direct or session-style connections:

```text
FastAPI replicas × (pool_size + max_overflow)
+ migration connections
+ administration connections
+ Supabase platform headroom
```

Example:

```text
2 replicas × (3 + 2) = 10 possible application connections
```

## Runtime ownership

Create one engine per FastAPI process.

Do not:

- Create a new engine per request
- Create pools inside route handlers
- Hold database sessions while waiting for backend HTTP responses
- Share one mutable session globally

## Transaction boundaries

Recommended lifecycle:

1. Receive request.
2. Route and call backend without holding a database transaction.
3. Collect request and attempt data in memory.
4. Open a short transaction.
5. Persist request and attempts.
6. Commit and release.

## Transaction pooler rule

When using port `6543`:

- Do not depend on session variables.
- Do not depend on temporary tables across transactions.
- Do not use prepared statements.
- Configure asyncpg with prepared-statement caching disabled.

Conceptual option:

```text
statement_cache_size = 0
```

## Pool exhaustion behavior

Database pool exhaustion must not stop request routing.

Recommended behavior:

- Use bounded wait time.
- Increment a pool-timeout metric.
- Emit a structured warning.
- Drop non-critical telemetry if necessary.
- Preserve core request routing.
- Never retry indefinitely.

## Pool health metrics

Track:

- Checked-out connections
- Available connections
- Overflow connections
- Pool acquisition latency
- Pool timeout count
- Database connection errors
- Query duration
- Transaction duration
