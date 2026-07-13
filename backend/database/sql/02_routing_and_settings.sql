-- Active routing configuration, configuration history, and platform settings.

begin;

create table if not exists public.routing_configuration (
    singleton_id smallint primary key default 1,
    algorithm text not null default 'round_robin',
    config jsonb not null default '{}'::jsonb,
    updated_by text null,
    updated_at timestamptz not null default now(),

    constraint routing_configuration_singleton
        check (singleton_id = 1),

    constraint routing_configuration_algorithm
        check (algorithm in (
            'round_robin',
            'smooth_weighted_round_robin',
            'least_inflight'
        ))
);

create table if not exists public.routing_configuration_history (
    id uuid primary key default gen_random_uuid(),

    previous_algorithm text null,
    algorithm text not null,

    previous_config jsonb null,
    config jsonb not null default '{}'::jsonb,

    changed_by text null,
    reason text null,
    changed_at timestamptz not null default now(),

    constraint routing_configuration_history_previous_algorithm
        check (
            previous_algorithm is null
            or previous_algorithm in (
                'round_robin',
                'smooth_weighted_round_robin',
                'least_inflight'
            )
        ),

    constraint routing_configuration_history_algorithm
        check (algorithm in (
            'round_robin',
            'smooth_weighted_round_robin',
            'least_inflight'
        ))
);

create index if not exists idx_routing_configuration_history_changed_at
    on public.routing_configuration_history (changed_at desc);


create table if not exists public.platform_settings (
    singleton_id smallint primary key default 1,

    request_timeout_seconds numeric(10, 3) not null default 15,
    connect_timeout_seconds numeric(10, 3) not null default 3,

    health_check_enabled boolean not null default true,
    health_check_interval_seconds numeric(10, 3) not null default 5,
    healthy_threshold integer not null default 2,
    unhealthy_threshold integer not null default 3,

    max_request_body_bytes bigint not null default 10485760,

    rate_limit_requests integer not null default 300,
    rate_limit_window_seconds integer not null default 60,

    expose_selected_backend_header boolean not null default false,

    metadata jsonb not null default '{}'::jsonb,
    updated_by text null,
    updated_at timestamptz not null default now(),

    constraint platform_settings_singleton
        check (singleton_id = 1),

    constraint platform_settings_positive_values
        check (
            request_timeout_seconds > 0
            and connect_timeout_seconds > 0
            and health_check_interval_seconds > 0
            and healthy_threshold >= 1
            and unhealthy_threshold >= 1
            and max_request_body_bytes >= 1
            and rate_limit_requests >= 1
            and rate_limit_window_seconds >= 1
        )
);

commit;
