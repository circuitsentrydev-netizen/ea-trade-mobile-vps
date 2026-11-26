alter table public.trading_signals drop constraint if exists trading_signals_status_check;
alter table public.trading_signals add constraint trading_signals_status_check
check (status in ('ACTIVE','HIT_TP','HIT_SL','CANCELLED','EXPIRED','REJECTED','INVALIDATED'));
