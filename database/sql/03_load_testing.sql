-- Load-test run history, interval samples, and per-backend aggregate results.

begin;

create table if not exists public.load_test_runs (
    id uuid primary key default gen_random_uuid(),
    external_id text not null unique,

    name text null,
    target_path text not null default '/api/demo',

    status text not null default 'pending',
    duration_seconds integer not null,
    concurrency integer not null,

    selected_algorithm text null,

    started_at timestamptz null,
    completed_at timestamptz null,

    progress integer not null default 0,

    throughput_rps numeric(14, 3) not null default 0,
    average_latency_ms numeric(14, 3) not null default 0,
    p50_latency_ms numeric(14, 3) not null default 0,
    p95_latency_ms numeric(14, 3) not null default 0,
    p99_latency_ms numeric(14, 3) not null default 0,

    error_rate numeric(7, 4) not null default 0,

    success_count bigint not null default 0,
    error_count bigint not null default 0,
    total_requests bigint generated always as (success_count + error_count) stored,

    parameters jsonb not null default '{}'::jsonb,
    result_metadata jsonb not null default '{}'::jsonb,

    created_by text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint load_test_runs_status
        check (status in (
            'pending',
            'running',
            'completed',
            'failed',
            'cancelled'
        )),

    constraint load_test_runs_algorithm
        check (
            selected_algorithm is null
            or selected_algorithm in (
                'round_robin',
                'smooth_weighted_round_robin',
                'least_inflight'
            )
        ),

    constraint load_test_runs_positive_configuration
        check (duration_seconds >= 1 and concurrency >= 1),

    constraint load_test_runs_progress_range
        check (progress between 0 and 100),

    constraint load_test_runs_metrics_nonnegative
        check (
            throughput_rps >= 0
            and average_latency_ms >= 0
            and p50_latency_ms >= 0
            and p95_latency_ms >= 0
            and p99_latency_ms >= 0
            and error_rate between 0 and 100
            and success_count >= 0
            and error_count >= 0
        ),

    constraint load_test_runs_time_order
        check (
            completed_at is null
            or started_at is null
            or completed_at >= started_at
        )
);

create index if not exists idx_load_test_runs_created_at
    on public.load_test_runs (created_at desc);

create index if not exists idx_load_test_runs_status_created_at
    on public.load_test_runs (status, created_at desc);


create table if not exists public.load_test_samples (
    id bigint generated always as identity primary key,

    load_test_run_id uuid not null
        references public.load_test_runs(id)
        on delete cascade,

    sampled_at timestamptz not null default now(),

    progress integer not null,
    throughput_rps numeric(14, 3) not null default 0,

    average_latency_ms numeric(14, 3) not null default 0,
    p50_latency_ms numeric(14, 3) not null default 0,
    p95_latency_ms numeric(14, 3) not null default 0,
    p99_latency_ms numeric(14, 3) not null default 0,

    success_count bigint not null default 0,
    error_count bigint not null default 0,
    error_rate numeric(7, 4) not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    constraint load_test_samples_progress_range
        check (progress between 0 and 100),

    constraint load_test_samples_nonnegative
        check (
            throughput_rps >= 0
            and average_latency_ms >= 0
            and p50_latency_ms >= 0
            and p95_latency_ms >= 0
            and p99_latency_ms >= 0
            and success_count >= 0
            and error_count >= 0
            and error_rate between 0 and 100
        )
);

create index if not exists idx_load_test_samples_run_time
    on public.load_test_samples (load_test_run_id, sampled_at);


create table if not exists public.load_test_backend_results (
    load_test_run_id uuid not null
        references public.load_test_runs(id)
        on delete cascade,

    backend_id text not null
        references public.backend_services(id)
        on update cascade
        on delete restrict,

    request_count bigint not null default 0,
    success_count bigint not null default 0,
    error_count bigint not null default 0,

    average_latency_ms numeric(14, 3) not null default 0,
    p95_latency_ms numeric(14, 3) not null default 0,
    p99_latency_ms numeric(14, 3) not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    primary key (load_test_run_id, backend_id),

    constraint load_test_backend_results_nonnegative
        check (
            request_count >= 0
            and success_count >= 0
            and error_count >= 0
            and success_count + error_count <= request_count
            and average_latency_ms >= 0
            and p95_latency_ms >= 0
            and p99_latency_ms >= 0
        )
);

commit;
