-- Administrative audit history and per-actor alert acknowledgements.

begin;

create table if not exists public.audit_events (
    id uuid primary key default gen_random_uuid(),

    actor_id text null,
    actor_type text not null default 'admin_api_key',

    action text not null,
    object_type text not null,
    object_id text null,

    previous_state jsonb null,
    new_state jsonb null,

    reason text null,

    request_id text null,
    correlation_id text null,

    client_ip inet null,

    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now(),

    metadata jsonb not null default '{}'::jsonb,

    constraint audit_events_actor_type
        check (actor_type in (
            'admin_api_key',
            'user',
            'system',
            'worker'
        ))
);

create index if not exists idx_audit_events_time
    on public.audit_events (occurred_at desc);

create index if not exists idx_audit_events_object
    on public.audit_events (object_type, object_id, occurred_at desc);

create index if not exists idx_audit_events_actor
    on public.audit_events (actor_id, occurred_at desc)
    where actor_id is not null;


create table if not exists public.alert_acknowledgements (
    alert_key text not null,
    actor_id text not null default 'default-admin',

    acknowledged_at timestamptz not null default now(),
    note text null,

    primary key (alert_key, actor_id)
);

create index if not exists idx_alert_acknowledgements_actor_time
    on public.alert_acknowledgements (actor_id, acknowledged_at desc);

commit;
