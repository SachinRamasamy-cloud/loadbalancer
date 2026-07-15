# LoadFlow Frontend — Connected Angular Dashboard

This is the existing LoadFlow design connected to the FastAPI control API and Supabase-backed request history.

## Connected backend endpoints

- `GET /healthz`
- `GET /api/control/database/status`
- `GET /api/control/overview`
- `GET /api/control/metrics/timeseries`
- `GET /api/control/logs`
- `GET /api/control/history/requests`
- `GET /api/control/history/requests/{request_id}`
- Backend CRUD and enable/disable/drain endpoints
- Routing endpoints
- Analytics, pools, security, alerts, and load-test endpoints

## Local setup

```bash
npm install
npm start
```

Open:

```text
http://localhost:4200
```

The default backend is:

```text
http://localhost:8080
```

The default local admin key is:

```text
change-me
```

Change both values from **Settings → General & Connection**.

## Runtime configuration

Edit `public/runtime-config.js` before building:

```js
window.__LOADFLOW_CONFIG__ = {
  apiUrl: 'https://your-fastapi-domain.example.com',
  apiKey: 'your-demo-admin-key'
};
```

Values saved in the Settings page use `localStorage` and override the runtime defaults.

## Backend CORS

The FastAPI backend must include the frontend origin:

```env
CORS_ORIGINS=http://localhost:4200,https://your-frontend.vercel.app
```

For an HTTPS Vercel frontend, the backend must also use HTTPS. Browsers block HTTPS pages from calling an HTTP API.

## Production build

```bash
npm run build
```

Output:

```text
dist/dashboard-v2/browser
```

## Vercel

The included `vercel.json` uses:

```text
Build command: npm run build
Output directory: dist/dashboard-v2/browser
```

## Docker

Build:

```bash
docker build -t loadflow-frontend .
```

Run:

```bash
docker run --rm \
  -p 4200:80 \
  -e LOADFLOW_API_URL=http://localhost:8080 \
  -e LOADFLOW_API_KEY=change-me \
  loadflow-frontend
```

When the frontend and backend are in the same Docker Compose project, the browser still needs a host-accessible backend URL. Use `http://localhost:8080` for local browser access, not the Docker-only hostname `load-balancer`.

## Security note

An API key used by browser JavaScript can be inspected by users. For a public production deployment, expose read-only dashboard endpoints or add user authentication and server-side authorization instead of embedding a privileged administrative key.
