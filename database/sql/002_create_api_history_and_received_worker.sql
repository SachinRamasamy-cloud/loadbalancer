-- 002_create_api_history_and_received_worker.sql
-- LoadFlow Phase 2
--
-- Scope:
--   1. Store completed API request history.
--   2. Store received API events in a worker queue.
--   3. Provide PostgreSQL functions for enqueueing, claiming, completing,
--      failing, retrying, and saving request history.
--
-- This file intentionally does NOT create:
--   - backend attempt history
--   - health-check history
--   - load-test tables
--   - raw application logs
--
-- Security:
--   - Do not store Authorization headers, cookies, access tokens, passwords,
--     raw request bodies, or raw response bodies in metadata.
--   - Browser roles are blocked by default. FastAPI should access these
--     objects through a dedicated PostgreSQL runtime role.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. API request history
-- ---------------------------------------------------------------------------

create table if not exists public.api_request_history (
    id uuid primary key default gen_random_uuid(),

    request_id text not null unique,
    correlation_id text null,

    received_at timestamptz not null,
    completed_at timestamptz not null,

    http_method text not null,
    route text not null,
    query_present boolean not null default false,

    request_size_bytes bigint null
        check (request_size_bytes is null or request_size_bytes >= 0),

    response_size_bytes bigint null
        check (response_size_bytes is null or response_size_bytes >= 0),

    final_status_code integer not null
        check (final_status_code between 100 and 599),

    total_duration_ms numeric(14, 3) not null
        check (total_duration_ms >= 0),

    selected_algorithm text not null,
    final_backend_id text null,

    attempt_count integer not null default 1
        check (attempt_count >= 0),

    retry_count integer not null default 0
        check (retry_count >= 0),

    outcome text not null
        check (
            outcome in (
                'success',
                'client_error',
                'upstream_error',
                'timeout',
                'rejected',
                'cancelled',
                'internal_error'
            )
        ),

    error_type text null,
    error_code text null,

    worker_job_id uuid null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint api_request_history_completed_after_received
        check (completed_at >= received_at),

    constraint api_request_history_retry_count_valid
        check (retry_count <= attempt_count)
);

comment on table public.api_request_history is
    'Durable history for completed API requests received by LoadFlow.';

comment on column public.api_request_history.metadata is
    'Sanitized optional metadata. Never store credentials, tokens, cookies, or raw bodies.';

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

create index if not exists idx_api_request_history_worker_job_id
    on public.api_request_history (worker_job_id)
    where worker_job_id is not null;

create index if not exists idx_api_request_history_metadata_gin
    on public.api_request_history using gin (metadata);


-- ---------------------------------------------------------------------------
-- 2. Received API worker queue
-- ---------------------------------------------------------------------------

create table if not exists public.received_api_worker_jobs (
    id uuid primary key default gen_random_uuid(),

    request_id text not null unique,
    correlation_id text null,

    http_method text not null,
    route text not null,
    received_at timestamptz not null default now(),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'processing',
                'retry',
                'completed',
                'failed',
                'discarded'
            )
        ),

    priority smallint not null default 100
        check (priority between 0 and 1000),

    attempt_count integer not null default 0
        check (attempt_count >= 0),

    max_attempts integer not null default 5
        check (max_attempts >= 1),

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

    constraint received_api_worker_lock_consistency
        check (
            (status = 'processing' and locked_at is not null and locked_by is not null)
            or
            (status <> 'processing')
        ),

    constraint received_api_worker_completed_time
        check (
            completed_at is null
            or completed_at >= received_at
        )
);

comment on table public.received_api_worker_jobs is
    'Queue of sanitized received API events waiting for persistence or processing by a worker.';

comment on column public.received_api_worker_jobs.payload is
    'Sanitized worker payload. Never store credentials, tokens, cookies, or raw bodies.';

create index if not exists idx_received_api_worker_claim
    on public.received_api_worker_jobs (
        status,
        available_at,
        priority,
        received_at
    )
    where status in ('pending', 'retry');

create index if not exists idx_received_api_worker_locked_at
    on public.received_api_worker_jobs (locked_at)
    where status = 'processing';

create index if not exists idx_received_api_worker_received_at
    on public.received_api_worker_jobs (received_at desc);

create index if not exists idx_received_api_worker_correlation_id
    on public.received_api_worker_jobs (correlation_id)
    where correlation_id is not null;

create index if not exists idx_received_api_worker_payload_gin
    on public.received_api_worker_jobs using gin (payload);


-- ---------------------------------------------------------------------------
-- 3. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_received_api_worker_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_received_api_worker_updated_at
    on public.received_api_worker_jobs;

create trigger trg_received_api_worker_updated_at
before update on public.received_api_worker_jobs
for each row
execute function public.set_received_api_worker_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Enqueue a received API event
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_received_api_job(
    p_request_id text,
    p_correlation_id text,
    p_http_method text,
    p_route text,
    p_received_at timestamptz default now(),
    p_priority smallint default 100,
    p_max_attempts integer default 5,
    p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
    v_job_id uuid;
begin
    if p_request_id is null or btrim(p_request_id) = '' then
        raise exception 'request_id is required';
    end if;

    if p_http_method is null or btrim(p_http_method) = '' then
        raise exception 'http_method is required';
    end if;

    if p_route is null or btrim(p_route) = '' then
        raise exception 'route is required';
    end if;

    insert into public.received_api_worker_jobs (
        request_id,
        correlation_id,
        http_method,
        route,
        received_at,
        priority,
        max_attempts,
        payload
    )
    values (
        btrim(p_request_id),
        nullif(btrim(p_correlation_id), ''),
        upper(btrim(p_http_method)),
        btrim(p_route),
        coalesce(p_received_at, now()),
        p_priority,
        p_max_attempts,
        coalesce(p_payload, '{}'::jsonb)
    )
    on conflict (request_id) do update
    set
        correlation_id = excluded.correlation_id,
        http_method = excluded.http_method,
        route = excluded.route,
        priority = excluded.priority,
        max_attempts = excluded.max_attempts,
        payload = excluded.payload,
        available_at = least(
            public.received_api_worker_jobs.available_at,
            now()
        )
    returning id into v_job_id;

    return v_job_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Claim jobs safely with SKIP LOCKED
-- ---------------------------------------------------------------------------

create or replace function public.claim_received_api_jobs(
    p_worker_id text,
    p_batch_size integer default 100,
    p_lock_timeout_seconds integer default 300
)
returns setof public.received_api_worker_jobs
language plpgsql
as $$
begin
    if p_worker_id is null or btrim(p_worker_id) = '' then
        raise exception 'worker_id is required';
    end if;

    if p_batch_size < 1 or p_batch_size > 1000 then
        raise exception 'batch_size must be between 1 and 1000';
    end if;

    -- Recover jobs left locked by a crashed worker.
    update public.received_api_worker_jobs
    set
        status = 'retry',
        locked_at = null,
        locked_by = null,
        processing_started_at = null,
        available_at = now(),
        last_error_type = coalesce(last_error_type, 'WorkerLockExpired'),
        last_error_code = coalesce(last_error_code, 'WORKER_LOCK_EXPIRED'),
        last_error_message = coalesce(
            last_error_message,
            'Worker lock expired before completion'
        )
    where
        status = 'processing'
        and locked_at < now() - make_interval(secs => p_lock_timeout_seconds);

    return query
    with selected as (
        select id
        from public.received_api_worker_jobs
        where
            status in ('pending', 'retry')
            and available_at <= now()
            and attempt_count < max_attempts
        order by
            priority asc,
            available_at asc,
            received_at asc
        for update skip locked
        limit p_batch_size
    )
    update public.received_api_worker_jobs as jobs
    set
        status = 'processing',
        locked_at = now(),
        locked_by = btrim(p_worker_id),
        processing_started_at = now(),
        attempt_count = jobs.attempt_count + 1
    from selected
    where jobs.id = selected.id
    returning jobs.*;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Mark one worker job completed
-- ---------------------------------------------------------------------------

create or replace function public.complete_received_api_job(
    p_job_id uuid,
    p_worker_id text
)
returns boolean
language plpgsql
as $$
declare
    v_updated integer;
begin
    update public.received_api_worker_jobs
    set
        status = 'completed',
        completed_at = now(),
        locked_at = null,
        locked_by = null,
        last_error_type = null,
        last_error_code = null,
        last_error_message = null
    where
        id = p_job_id
        and status = 'processing'
        and locked_by = p_worker_id;

    get diagnostics v_updated = row_count;
    return v_updated = 1;
end;
$$;


-- ---------------------------------------------------------------------------
-- 7. Fail or retry one worker job
-- ---------------------------------------------------------------------------

create or replace function public.fail_received_api_job(
    p_job_id uuid,
    p_worker_id text,
    p_error_type text,
    p_error_code text,
    p_error_message text,
    p_retry_delay_seconds integer default 5
)
returns text
language plpgsql
as $$
declare
    v_status text;
begin
    update public.received_api_worker_jobs
    set
        status = case
            when attempt_count >= max_attempts then 'failed'
            else 'retry'
        end,
        available_at = case
            when attempt_count >= max_attempts then available_at
            else now() + make_interval(secs => greatest(p_retry_delay_seconds, 0))
        end,
        locked_at = null,
        locked_by = null,
        completed_at = case
            when attempt_count >= max_attempts then now()
            else null
        end,
        last_error_type = p_error_type,
        last_error_code = p_error_code,
        last_error_message = left(p_error_message, 2000)
    where
        id = p_job_id
        and status = 'processing'
        and locked_by = p_worker_id
    returning status into v_status;

    return v_status;
end;
$$;


-- ---------------------------------------------------------------------------
-- 8. Save or update API history
-- ---------------------------------------------------------------------------

create or replace function public.save_api_request_history(
    p_request_id text,
    p_correlation_id text,
    p_received_at timestamptz,
    p_completed_at timestamptz,
    p_http_method text,
    p_route text,
    p_query_present boolean,
    p_request_size_bytes bigint,
    p_response_size_bytes bigint,
    p_final_status_code integer,
    p_total_duration_ms numeric,
    p_selected_algorithm text,
    p_final_backend_id text,
    p_attempt_count integer,
    p_retry_count integer,
    p_outcome text,
    p_error_type text default null,
    p_error_code text default null,
    p_worker_job_id uuid default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
    v_history_id uuid;
begin
    insert into public.api_request_history (
        request_id,
        correlation_id,
        received_at,
        completed_at,
        http_method,
        route,
        query_present,
        request_size_bytes,
        response_size_bytes,
        final_status_code,
        total_duration_ms,
        selected_algorithm,
        final_backend_id,
        attempt_count,
        retry_count,
        outcome,
        error_type,
        error_code,
        worker_job_id,
        metadata
    )
    values (
        btrim(p_request_id),
        nullif(btrim(p_correlation_id), ''),
        p_received_at,
        p_completed_at,
        upper(btrim(p_http_method)),
        btrim(p_route),
        coalesce(p_query_present, false),
        p_request_size_bytes,
        p_response_size_bytes,
        p_final_status_code,
        p_total_duration_ms,
        btrim(p_selected_algorithm),
        nullif(btrim(p_final_backend_id), ''),
        coalesce(p_attempt_count, 1),
        coalesce(p_retry_count, 0),
        p_outcome,
        p_error_type,
        p_error_code,
        p_worker_job_id,
        coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (request_id) do update
    set
        correlation_id = excluded.correlation_id,
        completed_at = excluded.completed_at,
        http_method = excluded.http_method,
        route = excluded.route,
        query_present = excluded.query_present,
        request_size_bytes = excluded.request_size_bytes,
        response_size_bytes = excluded.response_size_bytes,
        final_status_code = excluded.final_status_code,
        total_duration_ms = excluded.total_duration_ms,
        selected_algorithm = excluded.selected_algorithm,
        final_backend_id = excluded.final_backend_id,
        attempt_count = excluded.attempt_count,
        retry_count = excluded.retry_count,
        outcome = excluded.outcome,
        error_type = excluded.error_type,
        error_code = excluded.error_code,
        worker_job_id = excluded.worker_job_id,
        metadata = excluded.metadata
    returning id into v_history_id;

    return v_history_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 9. Save history and complete worker job atomically
-- ---------------------------------------------------------------------------

create or replace function public.save_api_history_and_complete_job(
    p_job_id uuid,
    p_worker_id text,
    p_request_id text,
    p_correlation_id text,
    p_received_at timestamptz,
    p_completed_at timestamptz,
    p_http_method text,
    p_route text,
    p_query_present boolean,
    p_request_size_bytes bigint,
    p_response_size_bytes bigint,
    p_final_status_code integer,
    p_total_duration_ms numeric,
    p_selected_algorithm text,
    p_final_backend_id text,
    p_attempt_count integer,
    p_retry_count integer,
    p_outcome text,
    p_error_type text default null,
    p_error_code text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
    v_history_id uuid;
    v_completed boolean;
begin
    v_history_id := public.save_api_request_history(
        p_request_id,
        p_correlation_id,
        p_received_at,
        p_completed_at,
        p_http_method,
        p_route,
        p_query_present,
        p_request_size_bytes,
        p_response_size_bytes,
        p_final_status_code,
        p_total_duration_ms,
        p_selected_algorithm,
        p_final_backend_id,
        p_attempt_count,
        p_retry_count,
        p_outcome,
        p_error_type,
        p_error_code,
        p_job_id,
        p_metadata
    );

    v_completed := public.complete_received_api_job(
        p_job_id,
        p_worker_id
    );

    if not v_completed then
        raise exception
            'Worker job % was not completed. Check worker ownership and status.',
            p_job_id;
    end if;

    return v_history_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 10. Cleanup functions
-- ---------------------------------------------------------------------------

create or replace function public.delete_api_history_before(
    p_before timestamptz
)
returns bigint
language plpgsql
as $$
declare
    v_deleted bigint;
begin
    delete from public.api_request_history
    where received_at < p_before;

    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$$;

create or replace function public.delete_finished_worker_jobs_before(
    p_before timestamptz
)
returns bigint
language plpgsql
as $$
declare
    v_deleted bigint;
begin
    delete from public.received_api_worker_jobs
    where
        status in ('completed', 'failed', 'discarded')
        and coalesce(completed_at, updated_at) < p_before;

    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$$;


-- ---------------------------------------------------------------------------
-- 11. RLS and permissions
-- ---------------------------------------------------------------------------

alter table public.api_request_history enable row level security;
alter table public.received_api_worker_jobs enable row level security;

revoke all on table public.api_request_history from anon;
revoke all on table public.api_request_history from authenticated;

revoke all on table public.received_api_worker_jobs from anon;
revoke all on table public.received_api_worker_jobs from authenticated;

revoke all on function public.enqueue_received_api_job(
    text, text, text, text, timestamptz, smallint, integer, jsonb
) from public;

revoke all on function public.claim_received_api_jobs(
    text, integer, integer
) from public;

revoke all on function public.complete_received_api_job(
    uuid, text
) from public;

revoke all on function public.fail_received_api_job(
    uuid, text, text, text, text, integer
) from public;

revoke all on function public.save_api_request_history(
    text, text, timestamptz, timestamptz, text, text, boolean,
    bigint, bigint, integer, numeric, text, text, integer, integer,
    text, text, text, uuid, jsonb
) from public;

revoke all on function public.save_api_history_and_complete_job(
    uuid, text, text, text, timestamptz, timestamptz, text, text,
    boolean, bigint, bigint, integer, numeric, text, text, integer,
    integer, text, text, text, jsonb
) from public;

revoke all on function public.delete_api_history_before(
    timestamptz
) from public;

revoke all on function public.delete_finished_worker_jobs_before(
    timestamptz
) from public;

commit;
