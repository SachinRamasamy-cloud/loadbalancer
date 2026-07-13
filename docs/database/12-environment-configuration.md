# 12. Environment Configuration

## Backend variables

```env
DATABASE_URL_RUNTIME=
DATABASE_URL_MIGRATION=
DB_POOL_SIZE=3
DB_MAX_OVERFLOW=2
DB_POOL_TIMEOUT_SECONDS=10
DB_POOL_RECYCLE_SECONDS=600
DB_STATEMENT_TIMEOUT_MS=5000
DB_CONNECT_TIMEOUT_SECONDS=10
DB_SSL_MODE=require
```

## Telemetry writer

```env
TELEMETRY_ENABLED=true
TELEMETRY_QUEUE_MAX_SIZE=10000
TELEMETRY_BATCH_SIZE=250
TELEMETRY_FLUSH_INTERVAL_MS=500
TELEMETRY_RETRY_MAX_ATTEMPTS=3
TELEMETRY_RETRY_BASE_DELAY_MS=250
```

## Retention

```env
REQUEST_RETENTION_DAYS=30
HEALTH_CHECK_RETENTION_DAYS=14
SYSTEM_EVENT_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=365
POOL_SAMPLE_RETENTION_DAYS=14
```

## Rules

- Never commit production values.
- Never expose them to Angular.
- Never log full database URLs.
- Store secrets in backend hosting.
- Use different runtime and migration credentials where possible.
- Validate values at startup.

## Database module responsibilities

The database module should own:

- Engine creation
- Session factory
- Startup verification
- Graceful disposal
- Pool metrics
- Transaction helpers
- Exception normalization

Route handlers should not construct connection strings or engines.
