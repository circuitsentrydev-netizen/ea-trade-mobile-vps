-- Create a safe profile for each newly registered Supabase Auth user.
-- A requested mentor role is only an application; the profile remains CLIENT until approved.

create table if not exists public.mentor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text
);

alter table public.mentor_applications enable row level security;

create policy "users read own mentor application" on public.mentor_applications
for select to authenticated using (user_id = auth.uid() or public.is_superadmin());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'requested_role', 'CLIENT');
  insert into public.profiles (id, display_name, role, mentor_approved)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'CLIENT',
    false
  )
  on conflict (id) do nothing;

  if requested_role = 'MENTOR_ADMIN' then
    insert into public.mentor_applications (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- The authenticated user cannot insert, approve, reject or edit mentor applications.
-- Review actions must be performed by a trusted administrator service.
