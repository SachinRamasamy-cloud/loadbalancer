-- Structured operational logs. Raw console/debug logs should remain in the
-- deployment logging platform.

begin;

create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),

    occurred_at timestamptz not null default now(),

    level text not null,
    event_name text not null,
    component text not null,
    message text not null,

    request_id text null,
    correlation_id text null,
    backend_id text null,

    http_method text null,
    route text null,
    status_code integer null,

    duration_ms numeric(14, 3) null,

    error_type text null,
    error_code text null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint system_logs_level
        check (level in (
            'debug',
            'info',
            'warning',
            'error',
            'critical'
        )),

    constraint system_logs_status_code
        check (
            status_code is null
            or status_code between 100 and 599
        ),

    constraint system_logs_duration
        check (duration_ms is null or duration_ms >= 0)
);

comment on column public.system_logs.metadata is
    'Sanitized context only. Do not store passwords, tokens, cookies, or raw bodies.';

create index if not exists idx_system_logs_occurred_at
    on public.system_logs (occurred_at desc);

create index if not exists idx_system_logs_level_time
    on public.system_logs (level, occurred_at desc);

create index if not exists idx_system_logs_event_time
    on public.system_logs (event_name, occurred_at desc);

create index if not exists idx_system_logs_component_time
    on public.system_logs (component, occurred_at desc);

create index if not exists idx_system_logs_request_id
    on public.system_logs (request_id)
    where request_id is not null;

create index if not exists idx_system_logs_backend_time
    on public.system_logs (backend_id, occurred_at desc)
    where backend_id is not null;

create index if not exists idx_system_logs_metadata_gin
    on public.system_logs using gin (metadata);

commit;
