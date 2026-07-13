# 11. Open Decisions

Resolve before generating production SQL.

## Deployment

1. Where will FastAPI run?
2. Persistent container, autoscaling container, or serverless?
3. Can it reach the direct Supabase endpoint?
4. How many replicas?

## Authentication

1. Will the dashboard require login?
2. Will Supabase Auth be used?
3. Single-user, team-based, or multi-tenant?
4. Should users see only their own load tests?

## Request data

1. Which routes are recorded?
2. Are query parameters stored?
3. Is client IP omitted, truncated, or hashed?
4. Are bodies ever required?
5. What telemetry loss is acceptable during a crash?

## Retention

1. Raw request-history duration?
2. Audit retention?
3. External archive required?
4. Storage budget?

## Load testing

1. Is 5,000 requests a hard maximum?
2. Persist every request during tests?
3. Persist only aggregates for very large tests?
4. Maximum concurrency?

## Configuration

1. Should backends live in `.env`, Postgres, or both?
2. Which source wins on conflict?
3. Do changes apply immediately?

## Observability

1. Will raw logs remain in the hosting platform?
2. Will Prometheus/Grafana be added?
3. Which alerts are mandatory?
