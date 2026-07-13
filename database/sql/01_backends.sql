-- Backend configuration, current runtime state, and state-transition history.

begin;

create table if not exists public.backend_services (
    id text primary key,
    name text not null,
    url text not null,
    weight integer not null default 1,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz null,

    constraint backend_services_id_format
        check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$'),

    constraint backend_services_name_length
        check (char_length(name) between 2 and 100),

    constraint backend_services_url_length
        check (char_length(url) between 7 and 2048),

    constraint backend_services_weight_range
        check (weight between 1 and 100)
);

comment on table public.backend_services is
    'Durable backend definitions managed by the LoadFlow control API.';

create unique index if not exists uq_backend_services_active_url
    on public.backend_services (url)
    where deleted_at is null;

create index if not exists idx_backend_services_enabled
    on public.backend_services (enabled)
    where deleted_at is null;


create table if not exists public.backend_runtime_state (
    backend_id text primary key
        references public.backend_services(id)
        on update cascade
        on delete cascade,

    status text not null default 'unknown',
    active_requests integer not null default 0,
    total_requests bigint not null default 0,
    total_errors bigint not null default 0,

    last_latency_ms numeric(14, 3) null,
    last_checked_at timestamptz null,
    last_error text null,

    consecutive_successes integer not null default 0,
    consecutive_failures integer not null default 0,

    updated_at timestamptz not null default now(),

    constraint backend_runtime_state_status
        check (status in (
            'unknown',
            'healthy',
            'unhealthy',
            'draining',
            'disabled'
        )),

    constraint backend_runtime_state_nonnegative
        check (
            active_requests >= 0
            and total_requests >= 0
            and total_errors >= 0
            and consecutive_successes >= 0
            and consecutive_failures >= 0
            and (last_latency_ms is null or last_latency_ms >= 0)
        ),

    constraint backend_runtime_state_errors_not_above_total
        check (total_errors <= total_requests)
);

comment on table public.backend_runtime_state is
    'Current mutable health and request counters for each backend.';


create table if not exists public.backend_state_events (
    id uuid primary key default gen_random_uuid(),

    backend_id text not null
        references public.backend_services(id)
        on update cascade
        on delete restrict,

    from_status text null,
    to_status text not null,

    event_type text not null default 'status_changed',
    reason text null,
    source text not null default 'system',
    metadata jsonb not null default '{}'::jsonb,

    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now(),

    constraint backend_state_events_from_status
        check (
            from_status is null
            or from_status in (
                'unknown',
                'healthy',
                'unhealthy',
                'draining',
                'disabled'
            )
        ),

    constraint backend_state_events_to_status
        check (to_status in (
            'unknown',
            'healthy',
            'unhealthy',
            'draining',
            'disabled'
        ))
);

create index if not exists idx_backend_state_events_backend_time
    on public.backend_state_events (backend_id, occurred_at desc);

create index if not exists idx_backend_state_events_type_time
    on public.backend_state_events (event_type, occurred_at desc);

commit;
