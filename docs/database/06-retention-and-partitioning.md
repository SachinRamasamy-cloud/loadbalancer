# 6. Retention and Partitioning

## Proposed initial retention

| Data category | Raw retention | Aggregated retention |
|---|---:|---:|
| API requests | 30–90 days | 12 months |
| Request attempts | Same as parent | Derived aggregates |
| Health checks | 7–14 days | 90–180 days |
| Backend state events | 180 days | 12 months or longer |
| Load-test runs | 90–180 days | Long-term summary |
| Interval samples | 30–90 days | Daily summary |
| Structured system events | 14–30 days | Error counts only |
| Audit events | 180–365 days | According to policy |
| Pool samples | 7–14 days | 90-day aggregates |

## Aggregation strategy

Create hourly or daily summaries for:

- Request totals
- Success and failure totals
- Average latency
- P50, P95, and P99 latency
- Retry rate
- Backend traffic share
- Backend error rate
- Availability percentage

## Partitioning decision

Start with ordinary indexed tables.

Introduce time-based partitioning when:

- Tables reach millions of rows
- Time-based deletion becomes expensive
- Queries mostly filter by time
- Maintenance affects application performance

Likely candidates:

- API requests
- Request attempts
- Health checks
- Structured system events
- Pool samples

Likely partition key:

```text
created_at or occurred_at
```

Likely interval:

```text
Monthly for request history
Daily or monthly for very high-volume health data
```

## Deletion strategy

1. Build aggregates.
2. Verify aggregate completeness.
3. Remove expired raw data.
4. Monitor table and index growth.
5. Run routine Postgres maintenance.

## JSON usage

Store frequently filtered values as typed columns.

Use JSON only for optional structured context.
