"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Unable%20to%20sign%20in.%20Check%20your%20details%20and%20try%20again");
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("accountType") ?? "CLIENT");
  if (!displayName || !email || password.length < 8) {
    redirect("/register?error=Enter%20your%20name%20and%20email%2C%20and%20use%20a%20password%20of%20at%20least%208%20characters");
  }
  if (!["CLIENT", "MENTOR_ADMIN"].includes(requestedRole)) redirect("/register?error=Invalid%20account%20type");

  const supabase = createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: { display_name: displayName, requested_role: requestedRole }
    }
  });
  if (error) redirect("/register?error=Unable%20to%20create%20your%20account.%20Please%20try%20again");
  if (data.session) redirect("/dashboard");
  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
