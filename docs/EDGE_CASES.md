# Edge Cases

Covered:

- No eligible backend returns `503`.
- A backend disabled after selection is rejected by `registry.acquire`.
- Active counters cannot drop below zero.
- Removed backends are ignored when a response stream closes.
- Health checks survive connection errors and backend deletion.
- Request streams exceeding the byte limit return `413`.
- Safe methods retry only once and exclude the failed backend.
- Unsafe methods are not automatically replayed.
- Algorithm state adapts when backends are added or removed.
- Weighted routing validates weights between 1 and 100.
- Request IDs are preserved when supplied and created otherwise.
- Client disconnects close the upstream response in `finally`.

Known limitations:

- WebSocket upgrades are intentionally filtered and unsupported.
- HTTP trailers are unsupported.
- Multiple `Set-Cookie` headers can be collapsed by dictionary conversion.
- In-memory metrics are bounded and reset on restart.
- Streaming response failure may reach the caller after headers were already sent.
- The in-memory rate limiter is per balancer instance.
