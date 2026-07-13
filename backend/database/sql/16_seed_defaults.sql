-- Safe defaults only. No backend URLs are seeded here.

begin;

insert into public.routing_configuration (
    singleton_id,
    algorithm,
    config,
    updated_by
)
values (
    1,
    'round_robin',
    '{}'::jsonb,
    'migration'
)
on conflict (singleton_id) do nothing;


insert into public.platform_settings (
    singleton_id,
    request_timeout_seconds,
    connect_timeout_seconds,
    health_check_enabled,
    health_check_interval_seconds,
    healthy_threshold,
    unhealthy_threshold,
    max_request_body_bytes,
    rate_limit_requests,
    rate_limit_window_seconds,
    expose_selected_backend_header,
    updated_by
)
values (
    1,
    15,
    3,
    true,
    5,
    2,
    3,
    10485760,
    300,
    60,
    false,
    'migration'
)
on conflict (singleton_id) do nothing;

commit;
