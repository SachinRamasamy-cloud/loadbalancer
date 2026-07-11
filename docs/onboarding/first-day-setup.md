# First-Day Setup

1. Install Docker and Git.
2. Clone the repository.
3. Create `.env`.
4. Validate Compose.
5. Build and start services.
6. Open the dashboard.
7. Call `/healthz`.
8. Send a test request.
9. Read the architecture overview.

```bash
git clone <repository-url>
cd load-balancer
cp .env.example .env
docker compose up -d --build
```
