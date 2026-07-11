# Frontend Development

## Location

```text
frontend/
```

## Docker workflow

```bash
docker compose up -d --build dashboard
docker compose logs -f dashboard
```

## Direct workflow

```bash
cd frontend
npm install
npm start
```

Verify API base URLs, Nginx proxying, Angular output paths, and error states.
