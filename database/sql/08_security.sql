-- Rate-limit, authentication, and suspicious-request history.

begin;

create table if not exists public.security_events (
    id uuid primary key default gen_random_uuid(),

    event_type text not null,
    severity text not null default 'warning',

    title text not null,

    client_ip inet null,
    client_ip_hash text null,

    request_id text null,
    correlation_id text null,

    route text null,
    http_method text null,

    blocked boolean not null default false,

    metadata jsonb not null default '{}'::jsonb,

    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now(),

    constraint security_events_type
        check (event_type in (
            'rate_limit_exceeded',
            'auth_failure',
            'suspicious_request',
            'sql_injection_detected',
            'suspicious_user_agent',
            'ip_blocked',
            'ip_unblocked',
            'other'
        )),

    constraint security_events_severity
        check (severity in (
            'info',
            'warning',
            'error',
            'critical'
        ))
);

create index if not exists idx_security_events_time
    on public.security_events (occurred_at desc);

create index if not exists idx_security_events_type_time
    on public.security_events (event_type, occurred_at desc);

create index if not exists idx_security_events_ip_time
    on public.security_events (client_ip, occurred_at desc)
    where client_ip is not null;

create index if not exists idx_security_events_request_id
    on public.security_events (request_id)
    where request_id is not null;


create table if not exists public.security_ip_counters (
    client_ip inet primary key,

    rate_limit_hits bigint not null default 0,
    auth_failures bigint not null default 0,
    suspicious_events bigint not null default 0,

    blocked_until timestamptz null,

    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),

    metadata jsonb not null default '{}'::jsonb,

    constraint security_ip_counters_nonnegative
        check (
            rate_limit_hits >= 0
            and auth_failures >= 0
            and suspicious_events >= 0
        )
);

create index if not exists idx_security_ip_counters_last_seen
    on public.security_ip_counters (last_seen_at desc);

create index if not exists idx_security_ip_counters_total_events
    on public.security_ip_counters (
        (rate_limit_hits + auth_failures + suspicious_events) desc
    );

commit;
