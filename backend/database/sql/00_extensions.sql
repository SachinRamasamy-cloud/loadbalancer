-- LoadFlow database foundation.
-- Run first.

begin;

create extension if not exists pgcrypto;

commit;
