-- Active alerts and configurable cleanup functions.

begin;

create or replace function public.lf_get_active_alerts(
    p_actor_id text default 'default-admin',
    p_limit integer default 100
)
returns table (
    alert_key text,
    title text,
    source text,
    level text,
    occurred_at timestamptz,
    metadata jsonb
)
language sql
stable
as $$
with candidate_alerts as (
    select
        'backend-status-' || b.id || '-' || s.status as alert_key,
        case
            when s.status = 'unhealthy'
                then 'Health check failed for ' || b.name
            when s.status = 'draining'
                then 'Traffic draining enabled for ' || b.name
            when s.status = 'disabled'
                then 'Backend ' || b.name || ' has been disabled'
            else 'Backend state changed for ' || b.name
        end as title,
        'Backend: ' || b.id as source,
        case
            when s.status = 'unhealthy' then 'Critical'
            else 'Warning'
        end as level,
        coalesce(s.last_checked_at, s.updated_at) as occurred_at,
        jsonb_build_object(
            'backend_id', b.id,
            'status', s.status,
            'last_error', s.last_error
        ) as metadata
    from public.backend_services b
    join public.backend_runtime_state s
      on s.backend_id = b.id
    where b.deleted_at is null
      and s.status in ('unhealthy', 'draining', 'disabled')

    union all

    select
        'request-error-' || r.request_id,
        case
            when r.error_message is not null
                then 'Proxy error: ' || r.error_message
            else 'HTTP ' || r.final_status_code::text
                 || ' on ' || r.http_method || ' ' || r.route
        end,
        'Request ID: ' || r.request_id,
        case
            when r.final_status_code >= 500
              or r.error_type is not null
                then 'Critical'
            else 'Warning'
        end,
        r.completed_at,
        jsonb_build_object(
            'request_id', r.request_id,
            'status_code', r.final_status_code,
            'backend_id', r.final_backend_id,
            'error_type', r.error_type
        )
    from public.api_request_history r
    where r.completed_at >= now() - interval '24 hours'
      and (
          r.final_status_code >= 400
          or r.error_type is not null
      )

    union all

    select
        'security-' || e.id::text,
        e.title,
        coalesce(e.client_ip::text, 'Security monitor'),
        case
            when e.severity in ('error', 'critical')
                then 'Critical'
            else 'Warning'
        end,
        e.occurred_at,
        jsonb_build_object(
            'event_type', e.event_type,
            'client_ip', e.client_ip,
            'request_id', e.request_id
        )
    from public.security_events e
    where e.occurred_at >= now() - interval '24 hours'
      and e.severity in ('warning', 'error', 'critical')
)
select
    c.alert_key,
    c.title,
    c.source,
    c.level,
    c.occurred_at,
    c.metadata
from candidate_alerts c
left join public.alert_acknowledgements a
  on a.alert_key = c.alert_key
 and a.actor_id = p_actor_id
where a.alert_key is null
order by c.occurred_at desc
limit greatest(least(p_limit, 500), 1);
$$;


create or replace function public.lf_cleanup_expired_data(
    p_request_retention_days integer default 30,
    p_health_retention_days integer default 14,
    p_system_log_retention_days integer default 30,
    p_security_retention_days integer default 90,
    p_worker_retention_days integer default 7,
    p_pool_sample_retention_days integer default 14
)
returns jsonb
language plpgsql
as $$
declare
    v_requests bigint;
    v_health bigint;
    v_logs bigint;
    v_security bigint;
    v_workers bigint;
    v_pool bigint;
begin
    delete from public.api_request_history
    where received_at
        < now() - make_interval(days => p_request_retention_days);
    get diagnostics v_requests = row_count;

    delete from public.backend_health_checks
    where checked_at
        < now() - make_interval(days => p_health_retention_days);
    get diagnostics v_health = row_count;

    delete from public.system_logs
    where occurred_at
        < now() - make_interval(days => p_system_log_retention_days);
    get diagnostics v_logs = row_count;

    delete from public.security_events
    where occurred_at
        < now() - make_interval(days => p_security_retention_days);
    get diagnostics v_security = row_count;

    delete from public.api_ingest_jobs
    where status in ('completed', 'failed', 'discarded')
      and coalesce(completed_at, updated_at)
        < now() - make_interval(days => p_worker_retention_days);
    get diagnostics v_workers = row_count;

    delete from public.db_pool_samples
    where sampled_at
        < now() - make_interval(days => p_pool_sample_retention_days);
    get diagnostics v_pool = row_count;

    return jsonb_build_object(
        'api_requests_deleted', v_requests,
        'health_checks_deleted', v_health,
        'system_logs_deleted', v_logs,
        'security_events_deleted', v_security,
        'worker_jobs_deleted', v_workers,
        'pool_samples_deleted', v_pool
    );
end;
$$;

commit;
