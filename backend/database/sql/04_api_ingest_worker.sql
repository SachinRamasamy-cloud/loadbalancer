-- Durable queue used by a background worker to persist completed API events.

begin;

create table if not exists public.api_ingest_jobs (
    id uuid primary key default gen_random_uuid(),

    request_id text not null unique,
    correlation_id text null,

    http_method text not null,
    route text not null,
    query_present boolean not null default false,
    received_at timestamptz not null default now(),

    status text not null default 'pending',
    priority smallint not null default 100,

    attempt_count integer not null default 0,
    max_attempts integer not null default 5,

    available_at timestamptz not null default now(),

    locked_at timestamptz null,
    locked_by text null,
    processing_started_at timestamptz null,
    completed_at timestamptz null,

    last_error_type text null,
    last_error_code text null,
    last_error_message text null,

    payload jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint api_ingest_jobs_status
        check (status in (
            'pending',
            'processing',
            'retry',
            'completed',
            'failed',
            'discarded'
        )),

    constraint api_ingest_jobs_priority_range
        check (priority between 0 and 1000),

    constraint api_ingest_jobs_attempts
        check (
            attempt_count >= 0
            and max_attempts >= 1
            and attempt_count <= max_attempts
        ),

    constraint api_ingest_jobs_lock_consistency
        check (
            (
                status = 'processing'
                and locked_at is not null
                and locked_by is not null
            )
            or status <> 'processing'
        ),

    constraint api_ingest_jobs_completed_time
        check (
            completed_at is null
            or completed_at >= received_at
        )
);

comment on column public.api_ingest_jobs.payload is
    'Sanitized completed-request payload. Never store credentials, cookies, tokens, or raw bodies.';

create index if not exists idx_api_ingest_jobs_claim
    on public.api_ingest_jobs (
        status,
        available_at,
        priority,
        received_at
    )
    where status in ('pending', 'retry');

create index if not exists idx_api_ingest_jobs_locked_at
    on public.api_ingest_jobs (locked_at)
    where status = 'processing';

create index if not exists idx_api_ingest_jobs_received_at
    on public.api_ingest_jobs (received_at desc);

create index if not exists idx_api_ingest_jobs_correlation_id
    on public.api_ingest_jobs (correlation_id)
    where correlation_id is not null;

commit;
