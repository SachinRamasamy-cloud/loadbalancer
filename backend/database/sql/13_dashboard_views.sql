-- Read-only views matching the current dashboard pages.

begin;

create or replace view public.lf_v_backend_status as
select
    b.id,
    b.name,
    b.url,
    b.weight,
    b.enabled,
    s.status,
    s.active_requests,
    s.total_requests,
    s.total_errors,
    s.last_latency_ms,
    s.last_checked_at,
    s.last_error,
    s.consecutive_successes,
    s.consecutive_failures,
    case
        when b.enabled
         and s.status in ('healthy', 'unknown')
        then true
        else false
    end as eligible,
    case
        when s.total_requests = 0 then 0::numeric
        else round(
            s.total_errors::numeric / s.total_requests::numeric * 100,
            2
        )
    end as error_rate,
    b.created_at,
    b.updated_at
from public.backend_services b
join public.backend_runtime_state s
  on s.backend_id = b.id
where b.deleted_at is null;


create or replace view public.lf_v_recent_request_logs as
select
    r.request_id,
    r.completed_at as timestamp,
    r.http_method as method,
    r.route as path,
    r.final_backend_id as backend_id,
    r.final_status_code as status_code,
    r.total_duration_ms as duration_ms,
    r.error_message as error,
    r.retry_count
from public.api_request_history r;


create or replace view public.lf_v_request_overview_24h as
with scoped as (
    select *
    from public.api_request_history
    where received_at >= now() - interval '24 hours'
),
duration_stats as (
    select
        count(*)::bigint as total_requests,
        coalesce(avg(total_duration_ms), 0)::numeric as average_latency_ms,
        coalesce(
            percentile_cont(0.95) within group (
                order by total_duration_ms
            ),
            0
        )::numeric as p95_latency_ms,
        coalesce(
            percentile_cont(0.99) within group (
                order by total_duration_ms
            ),
            0
        )::numeric as p99_latency_ms,
        count(*) filter (
            where final_status_code >= 500
               or error_type is not null
        )::bigint as error_count,
        min(received_at) as first_received_at,
        max(completed_at) as last_completed_at
    from scoped
)
select
    total_requests,
    round(
        total_requests::numeric
        / greatest(
            extract(
                epoch from (
                    coalesce(last_completed_at, now())
                    - coalesce(first_received_at, now())
                )
            ),
            1
        ),
        2
    ) as requests_per_second,
    round(average_latency_ms, 2) as average_latency_ms,
    round(p95_latency_ms, 2) as p95_latency_ms,
    round(p99_latency_ms, 2) as p99_latency_ms,
    round(
        case
            when total_requests = 0 then 0
            else error_count::numeric / total_requests::numeric * 100
        end,
        2
    ) as error_rate
from duration_stats;


create or replace view public.lf_v_endpoint_analytics_24h as
select
    route as path,
    count(*)::bigint as requests,
    round(avg(total_duration_ms), 2) as average_latency_ms,
    round(
        percentile_cont(0.95) within group (
            order by total_duration_ms
        )::numeric,
        2
    ) as p95_latency_ms,
    round(
        percentile_cont(0.99) within group (
            order by total_duration_ms
        )::numeric,
        2
    ) as p99_latency_ms,
    round(
        count(*) filter (
            where final_status_code >= 500
               or error_type is not null
        )::numeric
        / greatest(count(*)::numeric, 1)
        * 100,
        2
    ) as error_rate
from public.api_request_history
where received_at >= now() - interval '24 hours'
group by route;


create or replace view public.lf_v_backend_distribution_24h as
select
    coalesce(final_backend_id, 'none') as backend_id,
    count(*)::bigint as request_count,
    round(
        count(*)::numeric
        / greatest(
            sum(count(*)) over (),
            1
        )::numeric
        * 100,
        2
    ) as traffic_share_percent
from public.api_request_history
where received_at >= now() - interval '24 hours'
group by coalesce(final_backend_id, 'none');


create or replace view public.lf_v_request_timeseries_15s as
select
    to_timestamp(
        floor(extract(epoch from received_at) / 15) * 15
    ) as bucket_start,
    count(*)::bigint as requests,
    count(*) filter (
        where final_status_code >= 500
           or error_type is not null
    )::bigint as errors,
    round(avg(total_duration_ms), 2) as average_latency_ms
from public.api_request_history
group by 1;


create or replace view public.lf_v_security_summary_24h as
select
    count(distinct client_ip) filter (
        where blocked = true
    )::bigint as blocked_ips_count,
    count(*) filter (
        where event_type = 'rate_limit_exceeded'
    )::bigint as rate_limit_hits,
    count(*) filter (
        where event_type = 'auth_failure'
    )::bigint as auth_failures,
    count(*) filter (
        where event_type in (
            'suspicious_request',
            'sql_injection_detected',
            'suspicious_user_agent'
        )
    )::bigint as suspicious_events
from public.security_events
where occurred_at >= now() - interval '24 hours';


create or replace view public.lf_v_load_test_history as
select
    id,
    external_id,
    name,
    target_path,
    status,
    duration_seconds,
    concurrency,
    selected_algorithm,
    started_at,
    completed_at,
    progress,
    throughput_rps,
    average_latency_ms,
    p50_latency_ms,
    p95_latency_ms,
    p99_latency_ms,
    error_rate,
    success_count,
    error_count,
    total_requests,
    created_at
from public.load_test_runs;


create or replace view public.lf_v_latest_db_pool_samples as
select distinct on (instance_id)
    instance_id,
    sampled_at,
    configured_pool_size,
    checked_in_connections,
    checked_out_connections,
    overflow_connections,
    acquisition_wait_ms,
    timeout_count,
    connection_error_count,
    metadata
from public.db_pool_samples
order by instance_id, sampled_at desc;

commit;
