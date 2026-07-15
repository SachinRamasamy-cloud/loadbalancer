# Live API Neural Flow

## What is implemented

The frontend now contains a global Angular HTTP interceptor that observes every
request made through `HttpClient`.

Each request is converted into an animated flow event:

```text
Angular UI -> HttpClient -> FastAPI Gateway -> API module -> service target
```

The implementation covers all HTTP methods automatically:

- GET
- POST
- PUT
- PATCH
- DELETE

## New route

```text
/api-flow
```

It is also available from the sidebar as **Live API Flow**.

## Endpoint mapping

| API family | Visualization node | Target |
|---|---|---|
| `/healthz` | Platform Health | Platform Runtime |
| `/api/control/database/status` | Database Status | Supabase |
| `/api/control/overview` | Overview API | Metrics Store |
| `/api/control/metrics/*` | Metrics API | Metrics Store |
| `/api/control/analytics` | Analytics API | Metrics Store |
| `/api/control/logs` | Logs API | Supabase |
| `/api/control/history/requests*` | Request History | Supabase |
| `/api/control/backends*` | Backend Control | Control Plane |
| `/api/control/routing` | Routing Control | Control Plane |
| `/api/control/pools` | Server Pools | Metrics Store |
| `/api/control/security/*` | Security API | Control Plane |
| `/api/control/alerts*` | Alerts API | Control Plane |
| `/api/control/load-test*` | Load Test API | Control Plane |
| Other `/api/*` routes | Proxy Traffic | Backend Pool |

## New files

```text
src/app/features/api-flow/api-flow.models.ts
src/app/features/api-flow/api-flow.service.ts
src/app/features/api-flow/api-flow.interceptor.ts
src/app/features/api-flow/api-flow.component.ts
```

## Updated files

```text
src/app/app.config.ts
src/app/app.routes.ts
src/app/layout/sidebar.component.ts
src/app/services/api.service.ts
src/app/shared/icon.component.ts
```

## How it works

1. `apiFlowInterceptor` starts a flow event before forwarding the request.
2. The request URL is classified into an API module.
3. The response status, latency, error, and selected-backend header are captured.
4. `ApiFlowService` stores the most recent 160 calls in memory.
5. The Live API Flow page renders those events as animated SVG signals.
6. Calls made from any dashboard page are observed, even when the flow page is
   not currently open.

## Important scope

The interceptor visualizes all API calls originating from this Angular browser
session. Backend-internal HTTP calls can only be shown when the backend exposes
those attempts through headers, request history, SSE, or WebSocket events.
