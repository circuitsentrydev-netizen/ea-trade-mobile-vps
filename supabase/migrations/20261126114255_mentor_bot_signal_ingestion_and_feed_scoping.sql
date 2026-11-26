-- Secure EA-to-platform signal ingestion and mentor/client feed scoping.
create table public.mentor_bot_tokens (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null unique references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  token_hint text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.mentor_bot_tokens enable row level security;
revoke all on public.mentor_bot_tokens from anon, authenticated;

drop policy if exists "authenticated users read published signals" on public.trading_signals;
create policy "mentor clients read their mentor signals"
on public.trading_signals for select to authenticated
using (
  mentor_id = auth.uid()
  or public.is_superadmin()
  or exists (
    select 1 from public.profiles client
    where client.id = auth.uid() and client.mentor_id = trading_signals.mentor_id
  )
);
