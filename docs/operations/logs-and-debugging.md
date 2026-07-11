# Logs and Debugging

```bash
docker compose logs -f
docker compose logs --tail=100 load-balancer
docker compose logs --tail=100 backend-fast backend-slow backend-unstable
```

Inspect a container:

```bash
docker inspect load-balancer-load-balancer-1
```
