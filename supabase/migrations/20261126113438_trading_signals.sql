-- Published mentor trading signals for authenticated client dashboards.
create table public.trading_signals (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9._-]{2,24}$'),
  direction text not null check (direction in ('BUY','SELL')),
  entry_price numeric(20,8) not null check (entry_price >= 0),
  stop_loss numeric(20,8) not null check (stop_loss > 0),
  take_profit numeric(20,8) not null check (take_profit > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','HIT_TP','HIT_SL','CANCELLED','EXPIRED')),
  notes text,
  published_at timestamptz not null default now(),
  expires_at timestamptz
);
create index trading_signals_published_idx on public.trading_signals(status, published_at desc);
alter table public.trading_signals enable row level security;
grant select on public.trading_signals to authenticated;
grant insert, update on public.trading_signals to authenticated;
create policy "authenticated users read published signals"
on public.trading_signals for select to authenticated
using (status <> 'CANCELLED' and (expires_at is null or expires_at > now()));
create policy "approved mentors publish signals"
on public.trading_signals for insert to authenticated
with check (
  mentor_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MENTOR_ADMIN' and p.mentor_approved = true)
);
create policy "approved mentors update own signals"
on public.trading_signals for update to authenticated
using (mentor_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MENTOR_ADMIN' and p.mentor_approved = true))
with check (mentor_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MENTOR_ADMIN' and p.mentor_approved = true));
