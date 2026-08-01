-- ══════════════════════════════════════════════════════════════
-- OMCR Queue System — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Replaces the Firebase Realtime Database tree used previously.
-- ══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Per-service running ticket counter (last number issued) ──
create table service_counters (
  code  text primary key,          -- 'B' | 'M' | 'D' | 'C'
  count integer not null default 0
);
insert into service_counters (code, count) values ('B',0),('M',0),('D',0),('C',0);

-- ── Per-service "now serving" number ──
create table serving_numbers (
  code            text primary key,
  current_number  integer not null default 0
);
insert into serving_numbers (code, current_number) values ('B',0),('M',0),('D',0),('C',0);

-- ── Whether a window is actively calling a customer ──
create table active_windows (
  code    text primary key,
  active  boolean not null default false
);
insert into active_windows (code, active) values ('B',false),('M',false),('D',false),('C',false);

-- ── The live queue ──
create table queue (
  num               text primary key,   -- e.g. 'B001'
  code              text not null,
  status            text not null default 'waiting',  -- waiting | serving | done | skipped | transferred
  name              text,               -- requestor name (from public kiosk)
  contact           text,
  purpose           text,
  owner_name        text,               -- document owner (may differ from requestor)
  relationship      text,               -- requestor's relationship to owner
  priority          text,
  handled_by        text,
  transferred_from  text,
  transferred_to    text,
  transferred_by    text,
  transferred_at    bigint,             -- epoch ms, matches original Date.now() values
  recalled_at       bigint,
  staff_note        text,
  staff_note_by     text,
  staff_note_at     bigint,
  created_at        timestamptz not null default now()
);

-- ── Daily issued-ticket totals (per date, all services combined) ──
create table daily_counts (
  date   text primary key,   -- 'YYYY-MM-DD'
  count  integer not null default 0
);

-- ── Audit trail ──
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  date          text,
  time          text,
  ts            timestamptz not null default now(),
  code          text,
  num           text,
  action        text,
  detail        text,
  type          text,
  staff         text,
  window_name   text,
  service_name  text
);

-- ── Manual/auto backups ──
create table backups (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,     -- 'manual' | 'auto'
  ts           timestamptz not null default now(),
  counters     jsonb,
  serving      jsonb,
  by           text,
  window_name  text
);

-- ── Staff role assignments (references Supabase Auth users) ──
create table staff_roles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  role          text not null,   -- 'birth' | 'marriage' | 'death' | 'correction' | 'admin'
  display_name  text             -- shown as "Handled By" on staff pages; falls back to email if null
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- Mirrors the previous Firebase setup: the queue/counters/serving/
-- audit/backups data was fully open to anyone with the project URL
-- (no auth check on those reads/writes) — only staff_roles required
-- an authenticated user. Same posture is kept here for now so the
-- migration is behavior-equivalent. Tighten these later if you want
-- real access control (e.g. require auth for writes).
-- ══════════════════════════════════════════════════════════════

alter table service_counters enable row level security;
alter table serving_numbers  enable row level security;
alter table active_windows   enable row level security;
alter table queue            enable row level security;
alter table daily_counts     enable row level security;
alter table audit_log        enable row level security;
alter table backups          enable row level security;
alter table staff_roles      enable row level security;

create policy "public full access" on service_counters for all using (true) with check (true);
create policy "public full access" on serving_numbers  for all using (true) with check (true);
create policy "public full access" on active_windows   for all using (true) with check (true);
create policy "public full access" on queue             for all using (true) with check (true);
create policy "public full access" on daily_counts      for all using (true) with check (true);
create policy "public full access" on audit_log         for all using (true) with check (true);
create policy "public full access" on backups           for all using (true) with check (true);

-- Staff can only read their OWN role — not anyone else's, and no anon access.
create policy "read own role" on staff_roles for select using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- After running this:
-- 1. Create staff accounts in Authentication → Users.
-- 2. For each one, insert their role and display name, e.g.:
--      insert into staff_roles (user_id, role, display_name)
--      values ('<uid-from-auth>', 'birth', 'Fe Dimaculangan');
--    Use 'admin' for an account that should access every window.
--    display_name is optional — if left null, the page falls back to
--    showing the account's email as "Handled By" instead.
-- ══════════════════════════════════════════════════════════════

-- If you already ran an earlier version of this schema (without
-- display_name), run this once to add it:
--   alter table staff_roles add column if not exists display_name text;
