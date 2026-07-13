# LoadFlow Supabase Persistence Design

This documentation defines how LoadFlow should connect to Supabase Postgres and persist request history, retry attempts, backend health, load-test results, audit events, and structured operational logs.

No SQL schema is included in this package. The purpose is to freeze the architecture, connection strategy, retention policy, and operational rules before creating migrations.

## Documents

1. [System context and goals](01-system-context-and-goals.md)
2. [Proposed data domains](02-proposed-data-domains.md)
3. [Supabase connection strategy](03-supabase-connection-strategy.md)
4. [Connection pool design](04-connection-pool-design.md)
5. [Write path and batching](05-write-path-and-batching.md)
6. [Retention and partitioning](06-retention-and-partitioning.md)
7. [Security, RLS, and secrets](07-security-rls-and-secrets.md)
8. [Migration and schema lifecycle](08-migration-and-schema-lifecycle.md)
9. [Observability and troubleshooting](09-observability-and-troubleshooting.md)
10. [Phased rollout plan](10-phased-rollout-plan.md)
11. [Open decisions](11-open-decisions.md)
12. [Environment configuration](12-environment-configuration.md)
