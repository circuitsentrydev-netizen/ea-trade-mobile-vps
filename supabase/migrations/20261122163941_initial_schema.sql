-- EA Trade Mobile VPS: initial schema
-- Apply in the Supabase SQL editor. Review policies before production use.

create extension if not exists pgcrypto;

create type public.app_role as enum ('SUPERADMIN', 'MENTOR_ADMIN', 'CLIENT');
create type public.job_type as enum ('COMPILE_EA', 'START_INSTANCE', 'STOP_INSTANCE', 'UPDATE_EA');
create type public.job_status as enum ('PENDING', 'COMPLETED', 'FAILED');
create type public.instance_status as enum ('STOPPED', 'QUEUED', 'COMPILING', 'RUNNING', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'CLIENT',
  mentor_id uuid references public.profiles(id),
  mentor_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ea_builds (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  version_tag text not null,
  version_notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.license_keys (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete set null,
  key_hash text not null unique,
  key_hint text not null,
  expires_at timestamptz,
  max_accounts integer not null default 1 check (max_accounts > 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED')),
  created_at timestamptz not null default now()
);

create table public.mt5_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid references public.profiles(id),
  license_id uuid references public.license_keys(id),
  label text not null default 'My MT5 account',
  login_id text not null,
  broker_server text not null,
  account_mode text not null check (account_mode in ('DEMO','LIVE')),
  symbol text not null,
  timeframe text not null default 'M5',
  lot_size numeric(12,4) not null default 0.01 check (lot_size > 0),
  password_ciphertext text not null,
  password_iv text not null,
  password_auth_tag text not null,
  status public.instance_status not null default 'STOPPED',
  is_personal_mentor_slot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vps_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid references public.mt5_accounts(id) on delete set null,
  job_type public.job_type not null,
  payload jsonb not null default '{}'::jsonb,
  status public.job_status not null default 'PENDING',
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index vps_jobs_status_created_idx on public.vps_jobs(status, created_at);
create index mt5_accounts_owner_idx on public.mt5_accounts(owner_id);
create index license_keys_mentor_idx on public.license_keys(mentor_id);

create table public.telemetry_logs (
  id bigint generated always as identity primary key,
  account_id uuid not null references public.mt5_accounts(id) on delete cascade,
  setup_id text,
  event_type text not null,
  state text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Role and ownership helpers. SECURITY DEFINER avoids recursive profile RLS checks.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'SUPERADMIN', false)
$$;

alter table public.profiles enable row level security;
alter table public.ea_builds enable row level security;
alter table public.license_keys enable row level security;
alter table public.mt5_accounts enable row level security;
alter table public.vps_jobs enable row level security;
alter table public.telemetry_logs enable row level security;

create policy "profiles read self mentor clients or superadmin" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or public.is_superadmin()
  or mentor_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'MENTOR_ADMIN' and p.id = profiles.mentor_id)
);

create policy "profiles update self limited by server" on public.profiles
for update to authenticated using (id = auth.uid() or public.is_superadmin())
with check (id = auth.uid() or public.is_superadmin());

create policy "builds visible to mentor clients and superadmin" on public.ea_builds
for select to authenticated using (
  mentor_id = auth.uid() or public.is_superadmin()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.mentor_id = ea_builds.mentor_id)
);
create policy "mentor manages own builds" on public.ea_builds
for all to authenticated using (mentor_id = auth.uid() or public.is_superadmin())
with check (mentor_id = auth.uid() or public.is_superadmin());

create policy "licenses visible to owning mentor or assigned client" on public.license_keys
for select to authenticated using (mentor_id = auth.uid() or client_id = auth.uid() or public.is_superadmin());
create policy "mentor manages own licenses" on public.license_keys
for all to authenticated using (mentor_id = auth.uid() or public.is_superadmin())
with check (mentor_id = auth.uid() or public.is_superadmin());

-- Deliberately do not expose mt5_accounts to mentors: account passwords are never mentor-readable.
create policy "account owner and superadmin access" on public.mt5_accounts
for select to authenticated using (owner_id = auth.uid() or public.is_superadmin());
create policy "account owner inserts" on public.mt5_accounts
for insert to authenticated with check (owner_id = auth.uid());
create policy "account owner updates" on public.mt5_accounts
for update to authenticated using (owner_id = auth.uid() or public.is_superadmin())
with check (owner_id = auth.uid() or public.is_superadmin());
create policy "account owner deletes" on public.mt5_accounts
for delete to authenticated using (owner_id = auth.uid() or public.is_superadmin());

create policy "job owner reads jobs" on public.vps_jobs
for select to authenticated using (owner_id = auth.uid() or public.is_superadmin());
-- Job creation and worker updates are server-only via service role; no client insert/update policies.

create policy "telemetry owner reads" on public.telemetry_logs
for select to authenticated using (
  public.is_superadmin() or exists (
    select 1 from public.mt5_accounts a where a.id = telemetry_logs.account_id and a.owner_id = auth.uid()
  )
);
-- Telemetry inserts are server/worker-only.

-- Private EA file bucket. Restrict object access to authenticated mentor-owned paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ea-files', 'ea-files', false, 10485760, array['application/octet-stream','application/x-msdownload'])
on conflict (id) do nothing;

create policy "mentor reads own EA files" on storage.objects
for select to authenticated using (
  bucket_id = 'ea-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "mentor uploads own EA files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'ea-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "mentor deletes own EA files" on storage.objects
for delete to authenticated using (
  bucket_id = 'ea-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- IMPORTANT: Never allow users to set their own role or mentor_approved flag.
-- Provision SUPERADMIN and approve mentors through trusted server-side administration only.


-- Avoid recursive RLS evaluation when a user reads a mentor-linked profile.
drop policy if exists "profiles read self mentor clients or superadmin" on public.profiles;
create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles target
    where target.id = target_profile_id
      and (
        target.id = auth.uid()
        or target.mentor_id = auth.uid()
        or public.is_superadmin()
      )
  )
$$;
create policy "profiles read permitted relationships" on public.profiles
for select to authenticated using (public.can_view_profile(id));

-- A user must never promote themselves, approve themselves as a mentor,
-- or change their mentor assignment through the ordinary profile update path.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    if new.role is distinct from old.role
      or new.mentor_approved is distinct from old.mentor_approved
      or new.mentor_id is distinct from old.mentor_id then
      raise exception 'Role, mentor approval and mentor assignment are managed by administrators';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger
before update on public.profiles
for each row execute function public.protect_profile_privileges();
