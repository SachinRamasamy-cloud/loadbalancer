# API and Request Handling Layer

## Purpose

Accept client traffic, expose control and health endpoints, validate requests, and invoke the routing engine.

## Responsibilities

- Receive and validate requests
- Expose proxy routes and `/healthz`
- Normalize request paths and headers
- Forward requests to selected backends
- Return consistent upstream errors

## Reliability

- Use connection and response timeouts
- Retry only according to policy
- Reuse asynchronous HTTP clients
- Bound request sizes

## Security

- Authenticate administrative routes
- Restrict backend destinations
- Prevent SSRF
- Remove hop-by-hop headers
