# Branch Switching

Branch changes can leave obsolete containers and networks.

```bash
docker compose down --remove-orphans || true
git switch <branch-name>
docker compose config --services
docker compose up -d --build
```

Remove stale project containers:

```bash
docker ps -aq --filter "label=com.docker.compose.project=load-balancer" | xargs -r docker rm -f
docker network rm load-balancer_lbnet 2>/dev/null || true
```
