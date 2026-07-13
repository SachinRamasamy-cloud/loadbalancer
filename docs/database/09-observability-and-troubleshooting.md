# 9. Observability and Troubleshooting

## Application metrics

Expose:

- Query latency
- Transaction latency
- Pool acquisition latency
- Pool timeout count
- Checked-out connections
- Overflow connections
- Writer queue depth
- Batch size
- Flush duration
- Dropped telemetry events
- Failed batches
- Retry count

## Database monitoring

Monitor:

- Active connections by role and application
- Supavisor client connections
- Postgres backend connections
- CPU
- Memory
- Disk usage
- WAL growth
- Slow queries
- Lock waits
- Table and index growth

## Structured logging

Include:

- Timestamp
- Severity
- Component
- Event name
- Correlation ID
- Request ID
- Backend ID
- Database error class
- Retry count

Never log database passwords or full URLs.

## Common incidents

### Remaining connection slots

Possible causes:

- Too many replicas
- Oversized pools
- Connection leak
- Long transactions
- Migrations competing with application traffic

### Pool timeout

Possible causes:

- Slow queries
- Long transaction scopes
- Connections held during upstream calls
- Pool too small for measured concurrency
- Database pressure

### Prepared-statement errors

Likely cause:

- Transaction pooler used with prepared statements enabled

Action:

- Disable prepared statement caching or use direct/session mode.

### Database unavailable

Expected behavior:

- Continue routing.
- Record an in-memory failure metric.
- Back off retries.
- Drop lower-priority telemetry if needed.
- Recover automatically.

## Health states

Expose separate status for:

- Routing engine
- Backend health loop
- Database
- Telemetry writer
- Queue saturation
