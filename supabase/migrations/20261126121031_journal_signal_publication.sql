-- Journal-derived signals: no fabricated entry, stop-loss or take-profit values.
alter table public.trading_signals
  alter column entry_price drop not null,
  alter column stop_loss drop not null,
  alter column take_profit drop not null;

alter table public.trading_signals
  add column if not exists event_id text,
  add column if not exists setup_id text,
  add column if not exists timeframe text,
  add column if not exists source_utc timestamptz,
  add column if not exists confirmed_utc timestamptz,
  add column if not exists zone_low numeric,
  add column if not exists zone_high numeric,
  add column if not exists ea_version text,
  add column if not exists journal_schema_version text,
  add column if not exists raw_event jsonb,
  add column if not exists execution_status text not null default 'NOT_CONFIRMED',
  add column if not exists execution_event_id text,
  add column if not exists latest_status_event jsonb;

create unique index if not exists trading_signals_mentor_event_id_uidx
  on public.trading_signals (mentor_id, event_id)
  where event_id is not null;
create unique index if not exists trading_signals_mentor_setup_id_uidx
  on public.trading_signals (mentor_id, setup_id)
  where setup_id is not null;

alter table public.trading_signals
  add constraint trading_signals_execution_status_check
  check (execution_status in ('NOT_CONFIRMED','EXECUTED','NOT_EXECUTED','REJECTED','EXPIRED','INVALIDATED'))
  not valid;
alter table public.trading_signals validate constraint trading_signals_execution_status_check;
