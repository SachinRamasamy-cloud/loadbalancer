-- Read-only verification queries.
-- Run after all migrations.

select
    to_regclass('public.backend_services')
        as backend_services,
    to_regclass('public.api_request_history')
        as api_request_history,
    to_regclass('public.api_request_attempts')
        as api_request_attempts,
    to_regclass('public.backend_health_checks')
        as backend_health_checks,
    to_regclass('public.load_test_runs')
        as load_test_runs,
    to_regclass('public.security_events')
        as security_events,
    to_regclass('public.system_logs')
        as system_logs;

select *
from public.routing_configuration;

select *
from public.platform_settings;

select
    table_name
from information_schema.views
where table_schema = 'public'
  and table_name like 'lf_v_%'
order by table_name;

select
    routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name like 'lf_%'
order by routine_name;
