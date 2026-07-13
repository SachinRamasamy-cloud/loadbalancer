# 7. Security, RLS, and Secrets

## Trust boundary

The Angular frontend is untrusted.

FastAPI is the trusted application boundary.

Database credentials belong only in backend secret storage.

## Database roles

### Runtime role

Should have:

- Read/write access only to LoadFlow tables
- No schema creation
- No database administration
- No access to unrelated Supabase-managed schemas

### Migration role

Should have:

- Schema creation and alteration rights
- Migration-table access
- No use in normal API traffic

## Supabase keys

A secret or service-role key can bypass RLS.

Therefore:

- Never place it in Angular.
- Never expose it through public Vercel variables.
- Never commit it.
- Rotate immediately if exposed.

FastAPI direct Postgres access does not require a service-role key.

## RLS

Initial design:

```text
Angular → FastAPI → Postgres
```

RLS is still useful as defense in depth, especially if direct Supabase Data API access is added later.

Any table exposed through Supabase Data APIs must have correct RLS or equivalent protection.

## Sensitive data policy

Do not persist:

- Authorization
- Cookies
- API keys
- JWTs
- Passwords
- Full request bodies
- Full response bodies
- Unredacted secret-bearing query strings

Safe fields include:

- Method
- Normalized path
- Status
- Latency
- Sizes
- Backend ID
- Error category
- Correlation ID
- Hashed or truncated client address when required

## Transport security

Use encrypted database connections and certificate verification where supported.

## Audit fields

Administrative changes should record:

- Actor
- Action
- Object
- Previous state
- New state
- Timestamp
- Correlation ID
- Reason
