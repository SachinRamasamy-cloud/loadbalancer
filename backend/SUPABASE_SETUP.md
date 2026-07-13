# LoadFlow Backend with Supabase Persistence

This backend is the uploaded LoadFlow FastAPI project updated with optional Supabase Postgres persistence.

## Included persistence

- Backend definitions and state
- Routing algorithm configuration
- API request history
- Backend request attempts and retries
- Durable API-ingest worker queue
- Backend health-check history
- Security events
- Load-test history and samples
- Structured system logs
- Audit events and alert acknowledgements
- Database pool samples

## 1. Install the database schema

Run this file in the Supabase SQL Editor:

```text
database/sql/99_all_in_one.sql
```

Then run:

```text
database/sql/17_verification_queries.sql
```

## 2. Configure the backend

Copy the environment example:

```bash
cp .env.example .env
```

Set `DATABASE_URL_RUNTIME` to the Supabase Postgres connection string.

For a persistent FastAPI container, use the direct or Supavisor session-pooler connection.
For transaction pooling on port `6543`, set:

```env
DATABASE_TRANSACTION_POOLER=true
```

To require the database at startup:

```env
DATABASE_REQUIRED=true
```

When `DATABASE_REQUIRED=false`, LoadFlow continues with in-memory behavior if the database is unavailable.

## 3. Install and run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## 4. Docker

```bash
docker build -t loadflow-backend .
docker run --env-file .env -p 8080:8080 loadflow-backend
```

## 5. Database endpoints

```text
GET /healthz
GET /api/control/database/status
GET /api/control/history/requests
GET /api/control/history/requests/{request_id}
```

Control endpoints require `X-Admin-API-Key`.

## 6. Persistence model

Request processing remains non-blocking with respect to API-history storage:

```text
Proxy request
  -> in-memory metrics
  -> bounded local queue
  -> api_ingest_jobs
  -> background worker
  -> api_request_history + api_request_attempts
```

Configuration changes such as adding a backend or changing the routing algorithm are stored synchronously.

## 7. Tests

```bash
pytest -q
```

The provided backend passes all existing tests without requiring a database connection.
