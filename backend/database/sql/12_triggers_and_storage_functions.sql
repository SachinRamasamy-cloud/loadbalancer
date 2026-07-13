    -- Shared triggers and reusable write/worker functions.
    -- Functions use the lf_ prefix so permissions can be managed safely.

    begin;

    -- ---------------------------------------------------------------------------
    -- updated_at helper
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
        new.updated_at = now();
        return new;
    end;
    $$;

    drop trigger if exists trg_backend_services_updated_at
        on public.backend_services;

    create trigger trg_backend_services_updated_at
    before update on public.backend_services
    for each row
    execute function public.lf_set_updated_at();

    drop trigger if exists trg_backend_runtime_state_updated_at
        on public.backend_runtime_state;

    create trigger trg_backend_runtime_state_updated_at
    before update on public.backend_runtime_state
    for each row
    execute function public.lf_set_updated_at();

    drop trigger if exists trg_platform_settings_updated_at
        on public.platform_settings;

    create trigger trg_platform_settings_updated_at
    before update on public.platform_settings
    for each row
    execute function public.lf_set_updated_at();

    drop trigger if exists trg_load_test_runs_updated_at
        on public.load_test_runs;

    create trigger trg_load_test_runs_updated_at
    before update on public.load_test_runs
    for each row
    execute function public.lf_set_updated_at();

    drop trigger if exists trg_api_ingest_jobs_updated_at
        on public.api_ingest_jobs;

    create trigger trg_api_ingest_jobs_updated_at
    before update on public.api_ingest_jobs
    for each row
    execute function public.lf_set_updated_at();


    -- ---------------------------------------------------------------------------
    -- Backend storage
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_upsert_backend(
        p_id text,
        p_name text,
        p_url text,
        p_weight integer default 1,
        p_enabled boolean default true
    )
    returns public.backend_services
    language plpgsql
    as $$
    declare
        v_backend public.backend_services;
    begin
        insert into public.backend_services (
            id,
            name,
            url,
            weight,
            enabled,
            deleted_at
        )
        values (
            btrim(p_id),
            btrim(p_name),
            btrim(p_url),
            p_weight,
            p_enabled,
            null
        )
        on conflict (id) do update
        set
            name = excluded.name,
            url = excluded.url,
            weight = excluded.weight,
            enabled = excluded.enabled,
            deleted_at = null
        returning * into v_backend;

        insert into public.backend_runtime_state (
            backend_id,
            status
        )
        values (
            v_backend.id,
            case when v_backend.enabled then 'unknown' else 'disabled' end
        )
        on conflict (backend_id) do nothing;

        return v_backend;
    end;
    $$;


    create or replace function public.lf_soft_delete_backend(
        p_backend_id text,
        p_actor_id text default null,
        p_reason text default null
    )
    returns boolean
    language plpgsql
    as $$
    declare
        v_previous jsonb;
        v_updated integer;
    begin
        select to_jsonb(b)
        into v_previous
        from public.backend_services b
        where b.id = p_backend_id
        and b.deleted_at is null;

        update public.backend_services
        set
            enabled = false,
            deleted_at = now()
        where id = p_backend_id
        and deleted_at is null;

        get diagnostics v_updated = row_count;

        if v_updated = 1 then
            update public.backend_runtime_state
            set status = 'disabled'
            where backend_id = p_backend_id;

            insert into public.audit_events (
                actor_id,
                action,
                object_type,
                object_id,
                previous_state,
                new_state,
                reason
            )
            values (
                p_actor_id,
                'backend_deleted',
                'backend',
                p_backend_id,
                v_previous,
                jsonb_build_object('deleted_at', now(), 'enabled', false),
                p_reason
            );
        end if;

        return v_updated = 1;
    end;
    $$;


    create or replace function public.lf_set_backend_enabled(
        p_backend_id text,
        p_enabled boolean,
        p_actor_id text default null,
        p_reason text default null
    )
    returns public.backend_services
    language plpgsql
    as $$
    declare
        v_backend public.backend_services;
        v_old_status text;
        v_new_status text;
    begin
        select status
        into v_old_status
        from public.backend_runtime_state
        where backend_id = p_backend_id
        for update;

        update public.backend_services
        set enabled = p_enabled
        where id = p_backend_id
        and deleted_at is null
        returning * into v_backend;

        if not found then
            raise exception 'Backend not found: %', p_backend_id;
        end if;

        v_new_status := case when p_enabled then 'unknown' else 'disabled' end;

        update public.backend_runtime_state
        set status = v_new_status
        where backend_id = p_backend_id;

        if v_old_status is distinct from v_new_status then
            insert into public.backend_state_events (
                backend_id,
                from_status,
                to_status,
                event_type,
                reason,
                source
            )
            values (
                p_backend_id,
                v_old_status,
                v_new_status,
                case when p_enabled then 'enabled' else 'disabled' end,
                p_reason,
                coalesce(p_actor_id, 'system')
            );
        end if;

        insert into public.audit_events (
            actor_id,
            action,
            object_type,
            object_id,
            new_state,
            reason
        )
        values (
            p_actor_id,
            case when p_enabled then 'backend_enabled' else 'backend_disabled' end,
            'backend',
            p_backend_id,
            jsonb_build_object('enabled', p_enabled, 'status', v_new_status),
            p_reason
        );

        return v_backend;
    end;
    $$;


    create or replace function public.lf_set_backend_draining(
        p_backend_id text,
        p_actor_id text default null,
        p_reason text default null
    )
    returns boolean
    language plpgsql
    as $$
    declare
        v_old_status text;
    begin
        select status
        into v_old_status
        from public.backend_runtime_state
        where backend_id = p_backend_id
        for update;

        if not found then
            raise exception 'Backend not found: %', p_backend_id;
        end if;

        update public.backend_runtime_state
        set status = 'draining'
        where backend_id = p_backend_id;

        insert into public.backend_state_events (
            backend_id,
            from_status,
            to_status,
            event_type,
            reason,
            source
        )
        values (
            p_backend_id,
            v_old_status,
            'draining',
            'draining_enabled',
            p_reason,
            coalesce(p_actor_id, 'system')
        );

        insert into public.audit_events (
            actor_id,
            action,
            object_type,
            object_id,
            new_state,
            reason
        )
        values (
            p_actor_id,
            'backend_draining',
            'backend',
            p_backend_id,
            '{"status":"draining"}'::jsonb,
            p_reason
        );

        return true;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- Routing configuration
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_set_routing_algorithm(
        p_algorithm text,
        p_config jsonb default '{}'::jsonb,
        p_changed_by text default null,
        p_reason text default null
    )
    returns public.routing_configuration
    language plpgsql
    as $$
    declare
        v_previous public.routing_configuration;
        v_current public.routing_configuration;
    begin
        if p_algorithm not in (
            'round_robin',
            'smooth_weighted_round_robin',
            'least_inflight'
        ) then
            raise exception 'Unsupported algorithm: %', p_algorithm;
        end if;

        select *
        into v_previous
        from public.routing_configuration
        where singleton_id = 1
        for update;

        insert into public.routing_configuration (
            singleton_id,
            algorithm,
            config,
            updated_by
        )
        values (
            1,
            p_algorithm,
            coalesce(p_config, '{}'::jsonb),
            p_changed_by
        )
        on conflict (singleton_id) do update
        set
            algorithm = excluded.algorithm,
            config = excluded.config,
            updated_by = excluded.updated_by,
            updated_at = now()
        returning * into v_current;

        insert into public.routing_configuration_history (
            previous_algorithm,
            algorithm,
            previous_config,
            config,
            changed_by,
            reason
        )
        values (
            v_previous.algorithm,
            v_current.algorithm,
            v_previous.config,
            v_current.config,
            p_changed_by,
            p_reason
        );

        insert into public.audit_events (
            actor_id,
            action,
            object_type,
            object_id,
            previous_state,
            new_state,
            reason
        )
        values (
            p_changed_by,
            'routing_algorithm_changed',
            'routing_configuration',
            '1',
            case
                when v_previous.algorithm is null then null
                else jsonb_build_object(
                    'algorithm', v_previous.algorithm,
                    'config', v_previous.config
                )
            end,
            jsonb_build_object(
                'algorithm', v_current.algorithm,
                'config', v_current.config
            ),
            p_reason
        );

        return v_current;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- API ingest worker
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_enqueue_api_ingest_job(
        p_request_id text,
        p_correlation_id text,
        p_http_method text,
        p_route text,
        p_query_present boolean default false,
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
        insert into public.api_ingest_jobs (
            request_id,
            correlation_id,
            http_method,
            route,
            query_present,
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
            coalesce(p_query_present, false),
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
            query_present = excluded.query_present,
            priority = excluded.priority,
            max_attempts = excluded.max_attempts,
            payload = excluded.payload,
            available_at = least(public.api_ingest_jobs.available_at, now())
        returning id into v_job_id;

        return v_job_id;
    end;
    $$;


    create or replace function public.lf_claim_api_ingest_jobs(
        p_worker_id text,
        p_batch_size integer default 100,
        p_lock_timeout_seconds integer default 300
    )
    returns setof public.api_ingest_jobs
    language plpgsql
    as $$
    begin
        if p_batch_size < 1 or p_batch_size > 1000 then
            raise exception 'batch_size must be between 1 and 1000';
        end if;

        update public.api_ingest_jobs
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
            from public.api_ingest_jobs
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
        update public.api_ingest_jobs jobs
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


    create or replace function public.lf_fail_api_ingest_job(
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
        update public.api_ingest_jobs
        set
            status = case
                when attempt_count >= max_attempts then 'failed'
                else 'retry'
            end,
            available_at = case
                when attempt_count >= max_attempts then available_at
                else now() + make_interval(
                    secs => greatest(p_retry_delay_seconds, 0)
                )
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
    -- API history and attempts
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_save_api_request(
        p_request jsonb,
        p_attempts jsonb default '[]'::jsonb
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_api_request_id uuid;
        v_request_id text;
        v_attempt_count integer;
    begin
        if jsonb_typeof(p_request) <> 'object' then
            raise exception 'p_request must be a JSON object';
        end if;

        if jsonb_typeof(coalesce(p_attempts, '[]'::jsonb)) <> 'array' then
            raise exception 'p_attempts must be a JSON array';
        end if;

        v_request_id := nullif(btrim(p_request ->> 'request_id'), '');

        if v_request_id is null then
            raise exception 'request_id is required';
        end if;

        v_attempt_count := jsonb_array_length(coalesce(p_attempts, '[]'::jsonb));

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
            error_message,
            worker_job_id,
            load_test_run_id,
            client_ip,
            client_ip_hash,
            user_agent_family,
            metadata
        )
        values (
            v_request_id,
            nullif(btrim(p_request ->> 'correlation_id'), ''),
            (p_request ->> 'received_at')::timestamptz,
            (p_request ->> 'completed_at')::timestamptz,
            upper(p_request ->> 'http_method'),
            p_request ->> 'route',
            coalesce((p_request ->> 'query_present')::boolean, false),
            nullif(p_request ->> 'request_size_bytes', '')::bigint,
            nullif(p_request ->> 'response_size_bytes', '')::bigint,
            (p_request ->> 'final_status_code')::integer,
            (p_request ->> 'total_duration_ms')::numeric,
            coalesce(nullif(p_request ->> 'selected_algorithm', ''), 'none'),
            nullif(p_request ->> 'final_backend_id', ''),
            greatest(
                coalesce(
                    nullif(p_request ->> 'attempt_count', '')::integer,
                    v_attempt_count
                ),
                v_attempt_count
            ),
            coalesce(
                nullif(p_request ->> 'retry_count', '')::integer,
                greatest(v_attempt_count - 1, 0)
            ),
            p_request ->> 'outcome',
            nullif(p_request ->> 'error_type', ''),
            nullif(p_request ->> 'error_code', ''),
            nullif(p_request ->> 'error_message', ''),
            nullif(p_request ->> 'worker_job_id', '')::uuid,
            nullif(p_request ->> 'load_test_run_id', '')::uuid,
            nullif(p_request ->> 'client_ip', '')::inet,
            nullif(p_request ->> 'client_ip_hash', ''),
            nullif(p_request ->> 'user_agent_family', ''),
            coalesce(p_request -> 'metadata', '{}'::jsonb)
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
            error_message = excluded.error_message,
            worker_job_id = excluded.worker_job_id,
            load_test_run_id = excluded.load_test_run_id,
            client_ip = excluded.client_ip,
            client_ip_hash = excluded.client_ip_hash,
            user_agent_family = excluded.user_agent_family,
            metadata = excluded.metadata
        returning id into v_api_request_id;

        insert into public.api_request_attempts (
            api_request_id,
            request_id,
            attempt_number,
            backend_id,
            selected_algorithm,
            started_at,
            completed_at,
            duration_ms,
            upstream_status_code,
            outcome,
            retryable,
            retry_scheduled,
            error_type,
            error_code,
            error_message,
            metadata
        )
        select
            v_api_request_id,
            v_request_id,
            coalesce(
                nullif(item.value ->> 'attempt_number', '')::integer,
                item.ordinality::integer
            ),
            nullif(item.value ->> 'backend_id', ''),
            coalesce(
                nullif(item.value ->> 'selected_algorithm', ''),
                coalesce(nullif(p_request ->> 'selected_algorithm', ''), 'none')
            ),
            (item.value ->> 'started_at')::timestamptz,
            (item.value ->> 'completed_at')::timestamptz,
            (item.value ->> 'duration_ms')::numeric,
            nullif(item.value ->> 'upstream_status_code', '')::integer,
            item.value ->> 'outcome',
            coalesce((item.value ->> 'retryable')::boolean, false),
            coalesce((item.value ->> 'retry_scheduled')::boolean, false),
            nullif(item.value ->> 'error_type', ''),
            nullif(item.value ->> 'error_code', ''),
            nullif(item.value ->> 'error_message', ''),
            coalesce(item.value -> 'metadata', '{}'::jsonb)
        from jsonb_array_elements(coalesce(p_attempts, '[]'::jsonb))
            with ordinality as item(value, ordinality)
        on conflict (api_request_id, attempt_number) do update
        set
            backend_id = excluded.backend_id,
            selected_algorithm = excluded.selected_algorithm,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            duration_ms = excluded.duration_ms,
            upstream_status_code = excluded.upstream_status_code,
            outcome = excluded.outcome,
            retryable = excluded.retryable,
            retry_scheduled = excluded.retry_scheduled,
            error_type = excluded.error_type,
            error_code = excluded.error_code,
            error_message = excluded.error_message,
            metadata = excluded.metadata;

        return v_api_request_id;
    end;
    $$;


    create or replace function public.lf_save_api_request_and_complete_job(
        p_job_id uuid,
        p_worker_id text,
        p_request jsonb,
        p_attempts jsonb default '[]'::jsonb
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_api_request_id uuid;
        v_updated integer;
    begin
        p_request := jsonb_set(
            coalesce(p_request, '{}'::jsonb),
            '{worker_job_id}',
            to_jsonb(p_job_id::text),
            true
        );

        v_api_request_id := public.lf_save_api_request(
            p_request,
            p_attempts
        );

        update public.api_ingest_jobs
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

        if v_updated <> 1 then
            raise exception
                'Worker job % could not be completed by worker %',
                p_job_id,
                p_worker_id;
        end if;

        return v_api_request_id;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- Health storage and status transition
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_record_backend_health(
        p_backend_id text,
        p_success boolean,
        p_latency_ms numeric,
        p_status_code integer default null,
        p_error_type text default null,
        p_error_message text default null,
        p_healthy_threshold integer default 2,
        p_unhealthy_threshold integer default 3,
        p_metadata jsonb default '{}'::jsonb
    )
    returns public.backend_runtime_state
    language plpgsql
    as $$
    declare
        v_enabled boolean;
        v_state public.backend_runtime_state;
        v_old_status text;
        v_new_status text;
        v_successes integer;
        v_failures integer;
    begin
        select b.enabled
        into v_enabled
        from public.backend_services b
        join public.backend_runtime_state s
        on s.backend_id = b.id
        where
            b.id = p_backend_id
            and b.deleted_at is null
        for update of s;

        if not found then
            raise exception 'Backend not found: %', p_backend_id;
        end if;

        select *
        into v_state
        from public.backend_runtime_state
        where backend_id = p_backend_id;

        v_old_status := v_state.status;

        if p_success then
            v_successes := v_state.consecutive_successes + 1;
            v_failures := 0;
        else
            v_successes := 0;
            v_failures := v_state.consecutive_failures + 1;
        end if;

        if not v_enabled then
            v_new_status := 'disabled';
        elsif v_old_status = 'draining' then
            v_new_status := 'draining';
        elsif p_success and v_successes >= p_healthy_threshold then
            v_new_status := 'healthy';
        elsif not p_success and v_failures >= p_unhealthy_threshold then
            v_new_status := 'unhealthy';
        else
            v_new_status := v_old_status;
        end if;

        update public.backend_runtime_state
        set
            status = v_new_status,
            last_latency_ms = p_latency_ms,
            last_checked_at = now(),
            last_error = case
                when p_success then null
                else coalesce(p_error_message, p_error_type)
            end,
            consecutive_successes = v_successes,
            consecutive_failures = v_failures
        where backend_id = p_backend_id
        returning * into v_state;

        insert into public.backend_health_checks (
            backend_id,
            success,
            status_code,
            latency_ms,
            error_type,
            error_message,
            consecutive_successes,
            consecutive_failures,
            resulting_status,
            metadata
        )
        values (
            p_backend_id,
            p_success,
            p_status_code,
            p_latency_ms,
            p_error_type,
            p_error_message,
            v_successes,
            v_failures,
            v_new_status,
            coalesce(p_metadata, '{}'::jsonb)
        );

        if v_old_status is distinct from v_new_status then
            insert into public.backend_state_events (
                backend_id,
                from_status,
                to_status,
                event_type,
                reason,
                source,
                metadata
            )
            values (
                p_backend_id,
                v_old_status,
                v_new_status,
                'health_status_changed',
                case
                    when p_success then 'Healthy threshold reached'
                    else coalesce(p_error_message, 'Unhealthy threshold reached')
                end,
                'health_checker',
                coalesce(p_metadata, '{}'::jsonb)
            );
        end if;

        return v_state;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- Security event storage
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_record_security_event(
        p_event_type text,
        p_title text,
        p_client_ip inet default null,
        p_severity text default 'warning',
        p_request_id text default null,
        p_correlation_id text default null,
        p_route text default null,
        p_http_method text default null,
        p_blocked boolean default false,
        p_client_ip_hash text default null,
        p_metadata jsonb default '{}'::jsonb
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_event_id uuid;
    begin
        insert into public.security_events (
            event_type,
            severity,
            title,
            client_ip,
            client_ip_hash,
            request_id,
            correlation_id,
            route,
            http_method,
            blocked,
            metadata
        )
        values (
            p_event_type,
            p_severity,
            p_title,
            p_client_ip,
            p_client_ip_hash,
            p_request_id,
            p_correlation_id,
            p_route,
            upper(p_http_method),
            p_blocked,
            coalesce(p_metadata, '{}'::jsonb)
        )
        returning id into v_event_id;

        if p_client_ip is not null then
            insert into public.security_ip_counters (
                client_ip,
                rate_limit_hits,
                auth_failures,
                suspicious_events
            )
            values (
                p_client_ip,
                case when p_event_type = 'rate_limit_exceeded' then 1 else 0 end,
                case when p_event_type = 'auth_failure' then 1 else 0 end,
                case
                    when p_event_type in (
                        'suspicious_request',
                        'sql_injection_detected',
                        'suspicious_user_agent'
                    )
                    then 1
                    else 0
                end
            )
            on conflict (client_ip) do update
            set
                rate_limit_hits =
                    public.security_ip_counters.rate_limit_hits
                    + excluded.rate_limit_hits,
                auth_failures =
                    public.security_ip_counters.auth_failures
                    + excluded.auth_failures,
                suspicious_events =
                    public.security_ip_counters.suspicious_events
                    + excluded.suspicious_events,
                last_seen_at = now();
        end if;

        return v_event_id;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- Load-test storage
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_start_load_test(
        p_external_id text,
        p_target_path text,
        p_duration_seconds integer,
        p_concurrency integer,
        p_algorithm text default null,
        p_name text default null,
        p_created_by text default null,
        p_parameters jsonb default '{}'::jsonb
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_id uuid;
    begin
        insert into public.load_test_runs (
            external_id,
            name,
            target_path,
            status,
            duration_seconds,
            concurrency,
            selected_algorithm,
            started_at,
            progress,
            parameters,
            created_by
        )
        values (
            p_external_id,
            p_name,
            p_target_path,
            'running',
            p_duration_seconds,
            p_concurrency,
            p_algorithm,
            now(),
            0,
            coalesce(p_parameters, '{}'::jsonb),
            p_created_by
        )
        on conflict (external_id) do update
        set
            status = 'running',
            started_at = now(),
            completed_at = null,
            progress = 0,
            throughput_rps = 0,
            average_latency_ms = 0,
            p50_latency_ms = 0,
            p95_latency_ms = 0,
            p99_latency_ms = 0,
            error_rate = 0,
            success_count = 0,
            error_count = 0,
            parameters = excluded.parameters
        returning id into v_id;

        return v_id;
    end;
    $$;


    create or replace function public.lf_record_load_test_sample(
        p_load_test_run_id uuid,
        p_progress integer,
        p_throughput_rps numeric,
        p_average_latency_ms numeric,
        p_p50_latency_ms numeric,
        p_p95_latency_ms numeric,
        p_p99_latency_ms numeric,
        p_success_count bigint,
        p_error_count bigint,
        p_error_rate numeric,
        p_metadata jsonb default '{}'::jsonb
    )
    returns bigint
    language plpgsql
    as $$
    declare
        v_sample_id bigint;
    begin
        insert into public.load_test_samples (
            load_test_run_id,
            progress,
            throughput_rps,
            average_latency_ms,
            p50_latency_ms,
            p95_latency_ms,
            p99_latency_ms,
            success_count,
            error_count,
            error_rate,
            metadata
        )
        values (
            p_load_test_run_id,
            p_progress,
            p_throughput_rps,
            p_average_latency_ms,
            p_p50_latency_ms,
            p_p95_latency_ms,
            p_p99_latency_ms,
            p_success_count,
            p_error_count,
            p_error_rate,
            coalesce(p_metadata, '{}'::jsonb)
        )
        returning id into v_sample_id;

        update public.load_test_runs
        set
            progress = p_progress,
            throughput_rps = p_throughput_rps,
            average_latency_ms = p_average_latency_ms,
            p50_latency_ms = p_p50_latency_ms,
            p95_latency_ms = p_p95_latency_ms,
            p99_latency_ms = p_p99_latency_ms,
            success_count = p_success_count,
            error_count = p_error_count,
            error_rate = p_error_rate
        where id = p_load_test_run_id;

        return v_sample_id;
    end;
    $$;


    create or replace function public.lf_finish_load_test(
        p_load_test_run_id uuid,
        p_status text,
        p_throughput_rps numeric,
        p_average_latency_ms numeric,
        p_p50_latency_ms numeric,
        p_p95_latency_ms numeric,
        p_p99_latency_ms numeric,
        p_success_count bigint,
        p_error_count bigint,
        p_error_rate numeric,
        p_result_metadata jsonb default '{}'::jsonb
    )
    returns public.load_test_runs
    language plpgsql
    as $$
    declare
        v_run public.load_test_runs;
    begin
        update public.load_test_runs
        set
            status = p_status,
            completed_at = now(),
            progress = case
                when p_status = 'completed' then 100
                else progress
            end,
            throughput_rps = p_throughput_rps,
            average_latency_ms = p_average_latency_ms,
            p50_latency_ms = p_p50_latency_ms,
            p95_latency_ms = p_p95_latency_ms,
            p99_latency_ms = p_p99_latency_ms,
            success_count = p_success_count,
            error_count = p_error_count,
            error_rate = p_error_rate,
            result_metadata = coalesce(p_result_metadata, '{}'::jsonb)
        where id = p_load_test_run_id
        returning * into v_run;

        if not found then
            raise exception 'Load-test run not found: %', p_load_test_run_id;
        end if;

        return v_run;
    end;
    $$;


    -- ---------------------------------------------------------------------------
    -- System logs, audit, acknowledgements, and pool samples
    -- ---------------------------------------------------------------------------

    create or replace function public.lf_write_system_log(
        p_level text,
        p_event_name text,
        p_component text,
        p_message text,
        p_request_id text default null,
        p_correlation_id text default null,
        p_backend_id text default null,
        p_http_method text default null,
        p_route text default null,
        p_status_code integer default null,
        p_duration_ms numeric default null,
        p_error_type text default null,
        p_error_code text default null,
        p_metadata jsonb default '{}'::jsonb,
        p_occurred_at timestamptz default now()
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_id uuid;
    begin
        insert into public.system_logs (
            occurred_at,
            level,
            event_name,
            component,
            message,
            request_id,
            correlation_id,
            backend_id,
            http_method,
            route,
            status_code,
            duration_ms,
            error_type,
            error_code,
            metadata
        )
        values (
            coalesce(p_occurred_at, now()),
            p_level,
            p_event_name,
            p_component,
            p_message,
            p_request_id,
            p_correlation_id,
            p_backend_id,
            upper(p_http_method),
            p_route,
            p_status_code,
            p_duration_ms,
            p_error_type,
            p_error_code,
            coalesce(p_metadata, '{}'::jsonb)
        )
        returning id into v_id;

        return v_id;
    end;
    $$;


    create or replace function public.lf_write_audit_event(
        p_action text,
        p_object_type text,
        p_object_id text default null,
        p_actor_id text default null,
        p_actor_type text default 'admin_api_key',
        p_previous_state jsonb default null,
        p_new_state jsonb default null,
        p_reason text default null,
        p_request_id text default null,
        p_correlation_id text default null,
        p_client_ip inet default null,
        p_metadata jsonb default '{}'::jsonb
    )
    returns uuid
    language plpgsql
    as $$
    declare
        v_id uuid;
    begin
        insert into public.audit_events (
            actor_id,
            actor_type,
            action,
            object_type,
            object_id,
            previous_state,
            new_state,
            reason,
            request_id,
            correlation_id,
            client_ip,
            metadata
        )
        values (
            p_actor_id,
            p_actor_type,
            p_action,
            p_object_type,
            p_object_id,
            p_previous_state,
            p_new_state,
            p_reason,
            p_request_id,
            p_correlation_id,
            p_client_ip,
            coalesce(p_metadata, '{}'::jsonb)
        )
        returning id into v_id;

        return v_id;
    end;
    $$;


    create or replace function public.lf_acknowledge_alert(
        p_alert_key text,
        p_actor_id text default 'default-admin',
        p_note text default null
    )
    returns boolean
    language plpgsql
    as $$
    begin
        insert into public.alert_acknowledgements (
            alert_key,
            actor_id,
            note
        )
        values (
            p_alert_key,
            p_actor_id,
            p_note
        )
        on conflict (alert_key, actor_id) do update
        set
            acknowledged_at = now(),
            note = excluded.note;

        return true;
    end;
    $$;


    create or replace function public.lf_record_db_pool_sample(
        p_instance_id text,
        p_configured_pool_size integer,
        p_checked_in_connections integer,
        p_checked_out_connections integer,
        p_overflow_connections integer,
        p_acquisition_wait_ms numeric default null,
        p_timeout_count bigint default 0,
        p_connection_error_count bigint default 0,
        p_metadata jsonb default '{}'::jsonb
    )
    returns bigint
    language plpgsql
    as $$
    declare
        v_id bigint;
    begin
        insert into public.db_pool_samples (
            instance_id,
            configured_pool_size,
            checked_in_connections,
            checked_out_connections,
            overflow_connections,
            acquisition_wait_ms,
            timeout_count,
            connection_error_count,
            metadata
        )
        values (
            p_instance_id,
            p_configured_pool_size,
            p_checked_in_connections,
            p_checked_out_connections,
            p_overflow_connections,
            p_acquisition_wait_ms,
            p_timeout_count,
            p_connection_error_count,
            coalesce(p_metadata, '{}'::jsonb)
        )
        returning id into v_id;

        return v_id;
    end;
    $$;

    commit;
