# Control API

All control endpoints require:

```text
X-Admin-API-Key: <ADMIN_API_KEY>
```

Endpoints:

- `GET /api/control/overview`
- `GET /api/control/metrics/timeseries`
- `GET /api/control/logs?limit=100`
- `GET /api/control/backends`
- `POST /api/control/backends`
- `PATCH /api/control/backends/{id}`
- `DELETE /api/control/backends/{id}`
- `POST /api/control/backends/{id}/enable`
- `POST /api/control/backends/{id}/disable`
- `POST /api/control/backends/{id}/drain`
- `GET /api/control/routing`
- `PUT /api/control/routing`

All other supported HTTP paths are forwarded through the data plane.
