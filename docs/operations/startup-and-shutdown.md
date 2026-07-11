# Startup and Shutdown

## Start full stack

```bash
docker compose up -d --build
```

## Start API services only

```bash
docker compose up -d --build   backend-fast backend-slow backend-unstable load-balancer
```

## Stop

```bash
docker compose down
```

## Stop and remove orphans

```bash
docker compose down --remove-orphans
```
