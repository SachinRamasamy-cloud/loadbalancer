# Runbook: Backend Unhealthy

1. Check container status.
2. Read backend logs.
3. Call `/health`.
4. Confirm hostname and port.
5. Verify environment values.
6. Rebuild only the affected backend.

```bash
docker compose ps
docker compose logs --tail=100 backend-unstable
```
