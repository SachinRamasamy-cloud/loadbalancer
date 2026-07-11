# Local Setup

```bash
git clone <repository-url>
cd load-balancer
cp .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
```

Open:

```text
Dashboard: http://localhost:4200
API:       http://localhost:8080
API Docs:  http://localhost:8080/docs
```
