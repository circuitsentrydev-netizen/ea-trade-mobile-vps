import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,100})$/);
  if (!match) return NextResponse.json({ error: "Missing or invalid bot token" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server integration is not configured" }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = createHash("sha256").update(match[1]).digest("hex");

  const { data: token, error: tokenError } = await admin.from("mentor_bot_tokens")
    .select("id,mentor_id,revoked_at").eq("token_hash", tokenHash).maybeSingle();
  if (tokenError || !token || token.revoked_at) return NextResponse.json({ error: "Bot token is invalid or revoked" }, { status: 401 });

  const { data: mentor, error: mentorError } = await admin.from("profiles")
    .select("role,mentor_approved").eq("id", token.mentor_id).maybeSingle();
  if (mentorError || mentor?.role !== "MENTOR_ADMIN" || !mentor.mentor_approved) {
    return NextResponse.json({ error: "Mentor is not approved" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  const symbol = String(body.symbol ?? "").trim().toUpperCase();
  const direction = String(body.direction ?? "").toUpperCase();
  const entry = Number(body.entry);
  const stop = Number(body.stop_loss);
  const target = Number(body.take_profit);
  const notes = String(body.notes ?? "").trim().slice(0, 500);
  const expiryHours = Number(body.expiry_hours ?? 24);

  if (!/^[A-Z0-9._-]{2,24}$/.test(symbol) || !["BUY", "SELL"].includes(direction)) {
    return NextResponse.json({ error: "Invalid symbol or direction" }, { status: 400 });
  }
  if (![entry, stop, target].every(v => Number.isFinite(v) && v > 0)) {
    return NextResponse.json({ error: "Entry, stop-loss and take-profit must be positive numbers" }, { status: 400 });
  }
  if (direction === "BUY" && !(stop < entry && target > entry)) {
    return NextResponse.json({ error: "BUY requires stop-loss below entry and target above entry" }, { status: 400 });
  }
  if (direction === "SELL" && !(stop > entry && target < entry)) {
    return NextResponse.json({ error: "SELL requires stop-loss above entry and target below entry" }, { status: 400 });
  }
  if (![0, 1, 4, 8, 12, 24, 48, 72].includes(expiryHours)) {
    return NextResponse.json({ error: "Unsupported expiry_hours" }, { status: 400 });
  }

  const expiresAt = expiryHours === 0 ? null : new Date(Date.now() + expiryHours * 3600000).toISOString();
  const { data: signal, error } = await admin.from("trading_signals").insert({
    mentor_id: token.mentor_id, symbol, direction, entry_price: entry,
    stop_loss: stop, take_profit: target, notes: notes || null,
    status: "ACTIVE", expires_at: expiresAt
  }).select("id,symbol,direction,entry_price,stop_loss,take_profit,status,published_at").single();
  if (error || !signal) return NextResponse.json({ error: "Signal could not be published" }, { status: 500 });

  await admin.from("mentor_bot_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);
  return NextResponse.json({ ok: true, signal }, { status: 201 });
}
