# Runbook: Missing Dockerfile

```bash
ls -l backend/Dockerfile
ls -l test-backends/Dockerfile
docker compose config
```

`backend/Dockerfile` builds the load balancer. `test-backends/Dockerfile` builds the simulated backend services.
