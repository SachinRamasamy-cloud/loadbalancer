-- Periodic application-side database connection-pool metrics.

begin;

create table if not exists public.db_pool_samples (
    id bigint generated always as identity primary key,

    instance_id text not null,
    sampled_at timestamptz not null default now(),

    configured_pool_size integer not null,
    checked_in_connections integer not null,
    checked_out_connections integer not null,
    overflow_connections integer not null,

    acquisition_wait_ms numeric(14, 3) null,
    timeout_count bigint not null default 0,
    connection_error_count bigint not null default 0,

    metadata jsonb not null default '{}'::jsonb,

    constraint db_pool_samples_nonnegative
        check (
            configured_pool_size >= 0
            and checked_in_connections >= 0
            and checked_out_connections >= 0
            and overflow_connections >= 0
            and (acquisition_wait_ms is null or acquisition_wait_ms >= 0)
            and timeout_count >= 0
            and connection_error_count >= 0
        )
);

create index if not exists idx_db_pool_samples_instance_time
    on public.db_pool_samples (instance_id, sampled_at desc);

create index if not exists idx_db_pool_samples_time
    on public.db_pool_samples (sampled_at desc);

commit;
