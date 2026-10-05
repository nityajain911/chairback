-- ChairBack: one row per "Check a chat" request. Run once in Supabase > SQL Editor.
create table if not exists public.chairback_checks (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  visitor_hash        text not null,          -- keyed hash of IP, used only for the 5-per-day cap; no raw IP stored
  input               jsonb not null,         -- customer message, rate card, discount rule, diary status
  output              jsonb not null,         -- Gemini's structured answer, or the error
  status              text not null,          -- ok | refused | error
  booking_opportunity text,                   -- high | medium | low | none
  intents             text[] default '{}',
  language            text,
  unapproved_request  boolean default false,  -- customer asked for something the owner had not approved
  guard_blocked       boolean default false,  -- server-side price check blocked the draft
  model               text,
  input_tokens        integer,
  output_tokens       integer,
  latency_ms          integer
);
create index if not exists chairback_checks_visitor_idx on public.chairback_checks (visitor_hash, created_at);

-- Only the server (service key) can read or write. No public policies on purpose.
alter table public.chairback_checks enable row level security;

-- The number shown on the website
create or replace view public.chairback_stats as
select
  count(*) filter (where status = 'ok')                                              as chats_checked,
  count(*) filter (where status = 'ok' and booking_opportunity in ('high','medium')) as booking_opportunities,
  coalesce(round(100.0 * count(*) filter (where status = 'ok' and unapproved_request)
        / nullif(count(*) filter (where status = 'ok'), 0)), 0)                      as unapproved_pct,
  count(distinct language) filter (where status = 'ok')                              as languages
from public.chairback_checks;

revoke all on public.chairback_stats from anon, authenticated;
