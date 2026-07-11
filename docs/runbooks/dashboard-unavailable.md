# Runbook: Dashboard Unavailable

```bash
docker compose ps dashboard
docker compose logs --tail=200 dashboard
curl -I http://localhost:4200
docker compose up -d --build dashboard
```
