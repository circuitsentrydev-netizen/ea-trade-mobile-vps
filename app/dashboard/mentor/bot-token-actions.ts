"use server";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function rotateMentorBotToken() {
  const session = createSupabaseServerClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return { error: "Please sign in again." };
  const { data: profile } = await session.from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profile?.role !== "MENTOR_ADMIN" || !profile.mentor_approved) return { error: "Only approved mentors can connect a trading bot." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "Server administration is not configured." };
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = "MTBOT_" + randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error: saveError } = await admin.from("mentor_bot_tokens").upsert({
    mentor_id: user.id, token_hash: tokenHash, token_hint: token.slice(-6), revoked_at: null, last_used_at: null
  }, { onConflict: "mentor_id" });
  if (saveError) return { error: "Could not create the bot token. Try again." };
  return { token };
}

export async function revokeMentorBotToken() {
  const session = createSupabaseServerClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) return { error: "Please sign in again." };
  const { data: profile } = await session.from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profile?.role !== "MENTOR_ADMIN" || !profile.mentor_approved) return { error: "Mentor approval is required." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: "Server administration is not configured." };
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: revokeError } = await admin.from("mentor_bot_tokens").update({ revoked_at: new Date().toISOString() }).eq("mentor_id", user.id);
  return revokeError ? { error: "Could not revoke bot token." } : { ok: true };
}
