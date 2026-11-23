-- New Supabase projects no longer expose public tables to the Data API automatically.
-- Explicit grants enable authenticated API access; RLS policies remain the row-level boundary.
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.ea_builds to authenticated;
grant select on public.license_keys to authenticated;
grant select, insert, update, delete on public.mt5_accounts to authenticated;
grant select on public.vps_jobs to authenticated;
grant select on public.telemetry_logs to authenticated;
grant select on public.mentor_applications to authenticated;
