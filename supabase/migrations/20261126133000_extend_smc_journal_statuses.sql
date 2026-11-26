alter table public.trading_signals
  drop constraint if exists trading_signals_status_check,
  drop constraint if exists trading_signals_execution_status_check;

alter table public.trading_signals
  add constraint trading_signals_status_check
    check (status = any (array['ACTIVE','HIT_TP','HIT_SL','CANCELLED','EXPIRED','REJECTED','INVALIDATED','CLOSED'])),
  add constraint trading_signals_execution_status_check
    check (execution_status = any (array['NOT_CONFIRMED','PENDING','EXECUTED','NOT_EXECUTED','REJECTED','EXPIRED','INVALIDATED','CLOSED']));
