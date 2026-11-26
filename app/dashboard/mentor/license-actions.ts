"use server";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function mentorContext() {
  const session = createSupabaseServerClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return { error: "Please sign in again." as const };
  const { data: profile } = await session.from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profile?.role !== "MENTOR_ADMIN" || !profile.mentor_approved) return { error: "Approved mentor access is required." as const };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "Server administration is not configured." as const };
  return { user, admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

export async function createHostRobotKey(input: { maxAccounts?: number; expiresAt?: string | null }) {
  const ctx = await mentorContext();
  if ("error" in ctx) return { error: ctx.error };
  const maxAccounts = Number(input.maxAccounts ?? 1);
  if (!Number.isInteger(maxAccounts) || maxAccounts < 1 || maxAccounts > 5) return { error: "Account limit must be between 1 and 5." };
  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) return { error: "Expiry must be a future date." };
    expiresAt = parsed.toISOString();
  }
  const raw = randomBytes(4).toString("hex").toUpperCase();
  const key = `SMC-${raw.slice(0,4)}-${raw.slice(4)}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const { error } = await ctx.admin.from("license_keys").insert({
    mentor_id: ctx.user.id, key_hash: keyHash, key_hint: raw.slice(-4),
    max_accounts: maxAccounts, expires_at: expiresAt, status: "ACTIVE"
  });
  return error ? { error: "Could not create the HOST ROBOT KEY." } : { key };
}

export async function revokeHostRobotKey(id: string) {
  const ctx = await mentorContext();
  if ("error" in ctx) return { error: ctx.error };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Invalid key reference." };
  const { error } = await ctx.admin.from("license_keys").update({ status: "REVOKED" })
    .eq("id", id).eq("mentor_id", ctx.user.id).eq("status", "ACTIVE");
  return error ? { error: "Could not revoke this key." } : { ok: true };
}
