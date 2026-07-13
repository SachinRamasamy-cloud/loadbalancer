-- One row for every backend selection/attempt, including retry and failover.

begin;

create table if not exists public.api_request_attempts (
    id uuid primary key default gen_random_uuid(),

    api_request_id uuid not null
        references public.api_request_history(id)
        on delete cascade,

    request_id text not null,
    attempt_number integer not null,

    backend_id text null
        references public.backend_services(id)
        on update cascade
        on delete set null,

    selected_algorithm text not null,

    started_at timestamptz not null,
    completed_at timestamptz not null,

    duration_ms numeric(14, 3) not null,

    upstream_status_code integer null,

    outcome text not null,

    retryable boolean not null default false,
    retry_scheduled boolean not null default false,

    error_type text null,
    error_code text null,
    error_message text null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    unique (api_request_id, attempt_number),
    unique (request_id, attempt_number),

    constraint api_request_attempts_number
        check (attempt_number >= 1),

    constraint api_request_attempts_duration
        check (duration_ms >= 0),

    constraint api_request_attempts_status
        check (
            upstream_status_code is null
            or upstream_status_code between 100 and 599
        ),

    constraint api_request_attempts_time_order
        check (completed_at >= started_at),

    constraint api_request_attempts_algorithm
        check (selected_algorithm in (
            'round_robin',
            'smooth_weighted_round_robin',
            'least_inflight',
            'none'
        )),

    constraint api_request_attempts_outcome
        check (outcome in (
            'success',
            'upstream_error',
            'connect_error',
            'connect_timeout',
            'read_timeout',
            'stream_error',
            'request_body_too_large',
            'cancelled',
            'internal_error',
            'no_healthy_backend'
        ))
);

create index if not exists idx_api_request_attempts_request
    on public.api_request_attempts (api_request_id, attempt_number);

create index if not exists idx_api_request_attempts_backend_time
    on public.api_request_attempts (backend_id, started_at desc)
    where backend_id is not null;

create index if not exists idx_api_request_attempts_outcome_time
    on public.api_request_attempts (outcome, started_at desc);

create index if not exists idx_api_request_attempts_error_code
    on public.api_request_attempts (error_code, started_at desc)
    where error_code is not null;

commit;
