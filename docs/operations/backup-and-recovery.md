# Backup and Recovery

The current stack primarily uses in-memory state. Preserve source code, `docker-compose.yml`, `.env.example`, documentation, and any future persistent volumes.

```bash
git clone <repository-url>
cd load-balancer
cp .env.example .env
docker compose up -d --build
```
