# 2. Proposed Data Domains

This document defines the entities conceptually. Column types, constraints, indexes, and SQL will be defined later.

## Backend services

Represents every backend target known to LoadFlow.

Typical information:

- Stable backend identifier
- Display name
- Internal or external URL
- Weight
- Enabled state
- Current health state
- Created and updated timestamps
- Configuration version

## Algorithm configuration

Represents the active load-balancing policy and its history.

Typical information:

- Algorithm name
- Configuration payload
- Effective timestamp
- Changed by
- Change reason
- Previous configuration reference

## API requests

One row represents one logical request received by the load balancer.

Typical information:

- Request ID or correlation ID
- HTTP method
- Normalized route or path template
- Received timestamp
- Completed timestamp
- Final status code
- Total end-to-end latency
- Request and response byte counts
- Selected algorithm
- Final backend
- Attempt count
- Retry count
- Final outcome
- Load-test run reference

Do not store authorization headers, cookies, tokens, passwords, or raw request bodies by default.

## Request attempts

One row represents one attempt to send a request to one backend.

A single API request may have multiple attempts because of retries or failover.

Typical information:

- Attempt ID
- Parent request ID
- Attempt number
- Backend ID
- Start and finish timestamps
- Backend latency
- Upstream status code
- Network error category
- Timeout flag
- Retry decision
- Retry reason
- Outcome

## Health checks

Represents individual backend probes.

Typical information:

- Backend ID
- Check timestamp
- Status code
- Duration
- Healthy result
- Error category
- Consecutive success count
- Consecutive failure count

## Backend state events

Stores state transitions such as:

- healthy → unhealthy
- unhealthy → recovering
- recovering → healthy
- enabled → disabled
- weight changed

## Load-test runs

Represents a complete test execution.

Typical information:

- Test ID
- Name
- Started and completed timestamps
- Target request count
- Concurrency
- Target endpoint
- Algorithm
- Successful requests
- Failed requests
- Requests per second
- Percentile latencies
- Status

## Load-test interval samples

Stores compact time-bucket metrics for charts.

Typical information:

- Test ID
- Time bucket
- Request count
- Success count
- Failure count
- Average latency
- P50, P95, and P99 latency
- Backend distribution

## Audit events

Stores administrative changes, including backend creation, weight changes, algorithm changes, and health overrides.

## Structured system events

Stores important operational events only, such as connection-pool timeouts, telemetry queue saturation, and health-loop failures.

## Connection-pool samples

Stores periodic aggregates such as checked-out connections, available connections, overflow connections, pool wait time, timeout count, and database error count.

This is distinct from API request history.
