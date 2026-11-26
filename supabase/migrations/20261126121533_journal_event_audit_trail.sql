create table if not exists public.trading_signal_events (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  event_id text not null,
  setup_id text not null,
  event_type integer not null,
  event_type_name text not null,
  event_utc timestamptz not null,
  raw_event jsonb not null,
  received_at timestamptz not null default now(),
  unique (mentor_id,event_id)
);
create index if not exists trading_signal_events_mentor_setup_idx
  on public.trading_signal_events (mentor_id,setup_id,event_utc);
alter table public.trading_signal_events enable row level security;
revoke all on public.trading_signal_events from anon, authenticated;
