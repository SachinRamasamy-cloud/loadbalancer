-- 001_create_system_logs.sql
-- Phase 1: durable structured log storage for LoadFlow.
-- Run this file in the Supabase SQL Editor or through a migration tool.
--
-- This migration intentionally creates only the log table and its indexes.
-- It does not create request-history, retry-attempt, health-check, or
-- load-test tables.

create extension if not exists pgcrypto;

create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),

    occurred_at timestamptz not null default now(),

    level text not null
        check (level in ('debug', 'info', 'warning', 'error', 'critical')),

    event_name text not null,
    component text not null,
    message text not null,

    request_id text null,
    correlation_id text null,
    backend_id text null,

    http_method text null,
    route text null,
    status_code integer null
        check (status_code is null or status_code between 100 and 599),

    duration_ms numeric(12, 3) null
        check (duration_ms is null or duration_ms >= 0),

    error_type text null,
    error_code text null,

    metadata jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

comment on table public.system_logs is
    'Structured operational logs emitted by the LoadFlow backend.';

comment on column public.system_logs.metadata is
    'Optional structured context. Do not store credentials, tokens, cookies, or request bodies.';

create index if not exists idx_system_logs_occurred_at
    on public.system_logs (occurred_at desc);

create index if not exists idx_system_logs_level_occurred_at
    on public.system_logs (level, occurred_at desc);

create index if not exists idx_system_logs_event_name_occurred_at
    on public.system_logs (event_name, occurred_at desc);

create index if not exists idx_system_logs_component_occurred_at
    on public.system_logs (component, occurred_at desc);

create index if not exists idx_system_logs_request_id
    on public.system_logs (request_id)
    where request_id is not null;

create index if not exists idx_system_logs_correlation_id
    on public.system_logs (correlation_id)
    where correlation_id is not null;

create index if not exists idx_system_logs_backend_id_occurred_at
    on public.system_logs (backend_id, occurred_at desc)
    where backend_id is not null;

create index if not exists idx_system_logs_metadata_gin
    on public.system_logs using gin (metadata);

-- Block browser-side Supabase API roles by default.
-- The FastAPI backend should write through a direct PostgreSQL connection
-- using a dedicated runtime database role or the database owner.
alter table public.system_logs enable row level security;

revoke all on table public.system_logs from anon;
revoke all on table public.system_logs from authenticated;

-- No anon/authenticated RLS policies are created intentionally.
-- Add narrowly scoped policies later only if direct browser access is required.
