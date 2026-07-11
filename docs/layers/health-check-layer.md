# Health Check Layer

## Purpose

Determine whether a backend is eligible to receive traffic.

## Responsibilities

- Call each backend `/health` endpoint
- Record status and duration
- Mark services healthy or unhealthy
- Restore recovered services
- Prevent flapping

## Recommended state

```json
{
  "backend_id": "unstable",
  "healthy": false,
  "consecutive_failures": 3,
  "consecutive_successes": 0,
  "last_error": "Health check returned 503"
}
```

## Reliability rules

- Use bounded timeouts
- Require multiple failures before removal
- Require multiple successes before recovery
- Add jitter to periodic checks
