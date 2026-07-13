-- One row for each logical request completed by the load balancer.

begin;

create table if not exists public.api_request_history (
    id uuid primary key default gen_random_uuid(),

    request_id text not null unique,
    correlation_id text null,

    received_at timestamptz not null,
    completed_at timestamptz not null,

    http_method text not null,
    route text not null,
    query_present boolean not null default false,

    request_size_bytes bigint null,
    response_size_bytes bigint null,

    final_status_code integer not null,
    total_duration_ms numeric(14, 3) not null,

    selected_algorithm text not null,

    final_backend_id text null
        references public.backend_services(id)
        on update cascade
        on delete set null,

    attempt_count integer not null default 1,
    retry_count integer not null default 0,

    outcome text not null,

    error_type text null,
    error_code text null,
    error_message text null,

    worker_job_id uuid null
        references public.api_ingest_jobs(id)
        on delete set null,

    load_test_run_id uuid null
        references public.load_test_runs(id)
        on delete set null,

    client_ip inet null,
    client_ip_hash text null,
    user_agent_family text null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint api_request_history_method_length
        check (char_length(http_method) between 1 and 16),

    constraint api_request_history_status_code
        check (final_status_code between 100 and 599),

    constraint api_request_history_nonnegative
        check (
            total_duration_ms >= 0
            and attempt_count >= 0
            and retry_count >= 0
            and retry_count <= attempt_count
            and (request_size_bytes is null or request_size_bytes >= 0)
            and (response_size_bytes is null or response_size_bytes >= 0)
        ),

    constraint api_request_history_time_order
        check (completed_at >= received_at),

    constraint api_request_history_algorithm
        check (selected_algorithm in (
            'round_robin',
            'smooth_weighted_round_robin',
            'least_inflight',
            'none'
        )),

    constraint api_request_history_outcome
        check (outcome in (
            'success',
            'client_error',
            'upstream_error',
            'timeout',
            'rejected',
            'cancelled',
            'internal_error',
            'no_healthy_backend'
        ))
);

comment on table public.api_request_history is
    'Completed logical request history used by logs, analytics, and request tracking pages.';

comment on column public.api_request_history.metadata is
    'Sanitized optional context. Never store authorization headers, cookies, tokens, or full bodies.';

create index if not exists idx_api_request_history_received_at
    on public.api_request_history (received_at desc);

create index if not exists idx_api_request_history_completed_at
    on public.api_request_history (completed_at desc);

create index if not exists idx_api_request_history_correlation_id
    on public.api_request_history (correlation_id)
    where correlation_id is not null;

create index if not exists idx_api_request_history_route_received_at
    on public.api_request_history (route, received_at desc);

create index if not exists idx_api_request_history_status_received_at
    on public.api_request_history (final_status_code, received_at desc);

create index if not exists idx_api_request_history_backend_received_at
    on public.api_request_history (final_backend_id, received_at desc)
    where final_backend_id is not null;

create index if not exists idx_api_request_history_algorithm_received_at
    on public.api_request_history (selected_algorithm, received_at desc);

create index if not exists idx_api_request_history_outcome_received_at
    on public.api_request_history (outcome, received_at desc);

create index if not exists idx_api_request_history_load_test_run
    on public.api_request_history (load_test_run_id, received_at)
    where load_test_run_id is not null;

create index if not exists idx_api_request_history_metadata_gin
    on public.api_request_history using gin (metadata);

commit;
