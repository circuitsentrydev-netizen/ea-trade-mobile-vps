"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect("/dashboard/mentor?error=" + encodeURIComponent(message));
}

export async function publishSignalAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profileError || !profile || profile.role !== "MENTOR_ADMIN" || !profile.mentor_approved) {
    fail("Only approved mentors can publish trading signals.");
  }

  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const direction = String(formData.get("direction") ?? "");
  const entry = Number(formData.get("entry"));
  const stop = Number(formData.get("stopLoss"));
  const target = Number(formData.get("takeProfit"));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  const expiryHours = Number(formData.get("expiryHours") ?? "24");

  if (!/^[A-Z0-9._-]{2,24}$/.test(symbol)) fail("Enter a valid trading symbol.");
  if (!["BUY", "SELL"].includes(direction)) fail("Choose BUY or SELL.");
  if (![entry, stop, target].every(v => Number.isFinite(v) && v > 0)) fail("Entry, stop-loss and target must be positive prices.");
  if (direction === "BUY" && !(stop < entry && target > entry)) fail("For BUY signals, stop-loss must be below entry and target above entry.");
  if (direction === "SELL" && !(stop > entry && target < entry)) fail("For SELL signals, stop-loss must be above entry and target below entry.");
  if (![0, 1, 4, 8, 12, 24, 48, 72].includes(expiryHours)) fail("Choose a valid expiry period.");

  const expiresAt = expiryHours === 0 ? null : new Date(Date.now() + expiryHours * 3600000).toISOString();
  const { error } = await supabase.from("trading_signals").insert({
    mentor_id: user.id, symbol, direction, entry_price: entry,
    stop_loss: stop, take_profit: target, notes: notes || null,
    status: "ACTIVE", expires_at: expiresAt
  });
  if (error) fail("Signal could not be published. Confirm the signals migration is installed and try again.");
  redirect("/dashboard/mentor?published=1");
}

export async function updateSignalStatusAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const signalId = String(formData.get("signalId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(signalId) || !["CANCELLED", "HIT_TP", "HIT_SL", "EXPIRED"].includes(status)) {
    fail("Invalid signal update.");
  }
  const { data: profile } = await supabase.from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profile?.role !== "MENTOR_ADMIN" || !profile.mentor_approved) fail("Mentor approval is required.");
  const { error } = await supabase.from("trading_signals").update({ status }).eq("id", signalId).eq("mentor_id", user.id);
  if (error) fail("Could not update this signal.");
  redirect("/dashboard/mentor?updated=1");
}
