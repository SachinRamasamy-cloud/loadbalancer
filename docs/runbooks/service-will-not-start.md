# Runbook: Service Will Not Start

```bash
docker compose config --services
docker compose config
docker compose logs --tail=200 <service-name>
docker compose up -d --build <service-name>
```
