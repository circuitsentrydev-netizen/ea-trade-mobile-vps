-- Limit direct execution of trigger-only SECURITY DEFINER functions.
revoke all on function public.can_view_profile(uuid) from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

-- These three helpers are intentionally callable by signed-in users because
-- the RLS policies call them to evaluate the current user's permissions.
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
