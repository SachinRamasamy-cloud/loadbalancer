# Runbook: Docker Network Error

## Symptoms

- Network has active endpoints
- Container is not connected to the expected network
- Errors appear after switching branches

## Recovery

```bash
docker compose down --remove-orphans || true

docker ps -aq --filter "label=com.docker.compose.project=load-balancer"   | xargs -r docker rm -f

docker network rm load-balancer_lbnet 2>/dev/null || true
docker compose up -d --force-recreate
```
