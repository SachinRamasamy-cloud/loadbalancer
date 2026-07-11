# Incident Response

## Initial checks

```bash
docker compose ps
docker compose logs --tail=200
curl -i http://localhost:8080/healthz
```

Classify the issue as startup failure, network failure, unhealthy backend, high latency, high error rate, or dashboard-only failure. Preserve logs before destructive cleanup.
