-- Backend-only access model.
--
-- anon/authenticated are intentionally blocked.
-- Direct PostgreSQL connections using the database owner continue to work.
-- Supabase service_role may be used only from trusted backend infrastructure.

begin;

alter table public.backend_services enable row level security;
alter table public.backend_runtime_state enable row level security;
alter table public.backend_state_events enable row level security;
alter table public.routing_configuration enable row level security;
alter table public.routing_configuration_history enable row level security;
alter table public.platform_settings enable row level security;
alter table public.load_test_runs enable row level security;
alter table public.load_test_samples enable row level security;
alter table public.load_test_backend_results enable row level security;
alter table public.api_ingest_jobs enable row level security;
alter table public.api_request_history enable row level security;
alter table public.api_request_attempts enable row level security;
alter table public.backend_health_checks enable row level security;
alter table public.security_events enable row level security;
alter table public.security_ip_counters enable row level security;
alter table public.system_logs enable row level security;
alter table public.audit_events enable row level security;
alter table public.alert_acknowledgements enable row level security;
alter table public.db_pool_samples enable row level security;

revoke all on table public.backend_services
    from anon, authenticated;
revoke all on table public.backend_runtime_state
    from anon, authenticated;
revoke all on table public.backend_state_events
    from anon, authenticated;
revoke all on table public.routing_configuration
    from anon, authenticated;
revoke all on table public.routing_configuration_history
    from anon, authenticated;
revoke all on table public.platform_settings
    from anon, authenticated;
revoke all on table public.load_test_runs
    from anon, authenticated;
revoke all on table public.load_test_samples
    from anon, authenticated;
revoke all on table public.load_test_backend_results
    from anon, authenticated;
revoke all on table public.api_ingest_jobs
    from anon, authenticated;
revoke all on table public.api_request_history
    from anon, authenticated;
revoke all on table public.api_request_attempts
    from anon, authenticated;
revoke all on table public.backend_health_checks
    from anon, authenticated;
revoke all on table public.security_events
    from anon, authenticated;
revoke all on table public.security_ip_counters
    from anon, authenticated;
revoke all on table public.system_logs
    from anon, authenticated;
revoke all on table public.audit_events
    from anon, authenticated;
revoke all on table public.alert_acknowledgements
    from anon, authenticated;
revoke all on table public.db_pool_samples
    from anon, authenticated;

revoke all on table public.lf_v_backend_status
    from anon, authenticated;
revoke all on table public.lf_v_recent_request_logs
    from anon, authenticated;
revoke all on table public.lf_v_request_overview_24h
    from anon, authenticated;
revoke all on table public.lf_v_endpoint_analytics_24h
    from anon, authenticated;
revoke all on table public.lf_v_backend_distribution_24h
    from anon, authenticated;
revoke all on table public.lf_v_request_timeseries_15s
    from anon, authenticated;
revoke all on table public.lf_v_security_summary_24h
    from anon, authenticated;
revoke all on table public.lf_v_load_test_history
    from anon, authenticated;
revoke all on table public.lf_v_latest_db_pool_samples
    from anon, authenticated;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Revoke only LoadFlow functions, identified by the lf_ prefix.
do $$
declare
    item record;
begin
    for item in
        select
            p.oid::regprocedure as function_signature
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname like 'lf\_%' escape '\'
    loop
        execute format(
            'revoke all on function %s from public, anon, authenticated',
            item.function_signature
        );
    end loop;
end;
$$;

-- Optional trusted-server access through the Supabase service role.
grant select, insert, update, delete
    on public.backend_services,
       public.backend_runtime_state,
       public.backend_state_events,
       public.routing_configuration,
       public.routing_configuration_history,
       public.platform_settings,
       public.load_test_runs,
       public.load_test_samples,
       public.load_test_backend_results,
       public.api_ingest_jobs,
       public.api_request_history,
       public.api_request_attempts,
       public.backend_health_checks,
       public.security_events,
       public.security_ip_counters,
       public.system_logs,
       public.audit_events,
       public.alert_acknowledgements,
       public.db_pool_samples
    to service_role;

grant usage, select
    on all sequences in schema public
    to service_role;

grant select
    on public.lf_v_backend_status,
       public.lf_v_recent_request_logs,
       public.lf_v_request_overview_24h,
       public.lf_v_endpoint_analytics_24h,
       public.lf_v_backend_distribution_24h,
       public.lf_v_request_timeseries_15s,
       public.lf_v_security_summary_24h,
       public.lf_v_load_test_history,
       public.lf_v_latest_db_pool_samples
    to service_role;

do $$
declare
    item record;
begin
    for item in
        select
            p.oid::regprocedure as function_signature
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname like 'lf\_%' escape '\'
    loop
        execute format(
            'grant execute on function %s to service_role',
            item.function_signature
        );
    end loop;
end;
$$;

commit;
