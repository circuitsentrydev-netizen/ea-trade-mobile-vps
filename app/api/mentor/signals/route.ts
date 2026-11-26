import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type JournalEvent = {
  eventId: string;
  parentEventId: string;
  setupId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  timeframe: string;
  eventType: number;
  sourceUtc: string;
  confirmedUtc: string;
  sourceBrokerTime: string;
  confirmedBrokerTime: string;
  zoneLow: number;
  zoneHigh: number;
  reason: string;
  eaVersion: string;
  journalSchemaVersion: string;
  checksum: number;
  rawLine: string;
};

const EVENT = { QUALIFIED: 10, REJECTED: 12, EXPIRED: 13, EXECUTED: 14, INVALIDATED: 15 } as const;
const validUtc = (value: string) => /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value.replace(/^(\d{4})\.(\d{2})\.(\d{2}) /, "$1-$2-$3T") + "Z"));

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer ([A-Za-z0-9_-]{40,100})$/);
  if (!match) return NextResponse.json({ error: "Missing or invalid bot token" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server integration is not configured" }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const tokenHash = createHash("sha256").update(match[1]).digest("hex");
  const { data: token, error: tokenError } = await admin.from("mentor_bot_tokens")
    .select("id,mentor_id,revoked_at").eq("token_hash", tokenHash).maybeSingle();
  if (tokenError || !token || token.revoked_at) return NextResponse.json({ error: "Bot token is invalid or revoked" }, { status: 401 });
  const { data: mentor } = await admin.from("profiles").select("role,mentor_approved").eq("id", token.mentor_id).maybeSingle();
  if (mentor?.role !== "MENTOR_ADMIN" || !mentor.mentor_approved) return NextResponse.json({ error: "Mentor is not approved" }, { status: 403 });

  let body: { events?: JournalEvent[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 100) {
    return NextResponse.json({ error: "Send between 1 and 100 journal events" }, { status: 400 });
  }

  const results: Array<{ eventId: string; result: string }> = [];
  for (const e of body.events) {
    if (!e || !/^\d{1,20}$/.test(String(e.eventId)) || !/^\d{1,20}$/.test(String(e.setupId))) {
      results.push({ eventId: String(e?.eventId ?? ""), result: "invalid_identity" }); continue;
    }
    if (e.journalSchemaVersion !== "V3" || !/^[A-Z0-9._-]{2,24}$/.test(e.symbol)
      || !["BUY", "SELL"].includes(e.direction) || !/^[A-Z0-9_]+$/.test(e.timeframe)
      || ![e.zoneLow, e.zoneHigh].every(Number.isFinite) || e.zoneLow < 0 || e.zoneHigh < e.zoneLow
      || !validUtc(e.sourceUtc) || !validUtc(e.confirmedUtc)
      || !e.eaVersion || !Number.isInteger(e.checksum) || !e.rawLine || e.rawLine.length > 12000) {
      results.push({ eventId: e.eventId, result: "invalid_record" }); continue;
    }
    if (![EVENT.QUALIFIED, EVENT.REJECTED, EVENT.EXPIRED, EVENT.EXECUTED, EVENT.INVALIDATED].includes(e.eventType as 10|12|13|14|15)) {
      results.push({ eventId: e.eventId, result: "ignored_event_type" }); continue;
    }
    const sourceAt = new Date(e.sourceUtc.replace(/^(\d{4})\.(\d{2})\.(\d{2}) /, "$1-$2-$3T") + "Z").toISOString();
    const confirmedAt = new Date(e.confirmedUtc.replace(/^(\d{4})\.(\d{2})\.(\d{2}) /, "$1-$2-$3T") + "Z").toISOString();

    if (e.eventType === EVENT.QUALIFIED) {
      const rawEvent = { ...e, rawLine: e.rawLine };
      const { error } = await admin.from("trading_signals").insert({
        mentor_id: token.mentor_id, event_id: e.eventId, setup_id: e.setupId,
        symbol: e.symbol, direction: e.direction, timeframe: e.timeframe,
        source_utc: sourceAt, confirmed_utc: confirmedAt,
        zone_low: e.zoneLow, zone_high: e.zoneHigh,
        notes: e.reason || null, ea_version: e.eaVersion,
        journal_schema_version: e.journalSchemaVersion, raw_event: rawEvent,
        entry_price: null, stop_loss: null, take_profit: null,
        status: "ACTIVE", execution_status: "NOT_CONFIRMED"
      });
      if (error?.code === "23505") results.push({ eventId: e.eventId, result: "duplicate_setup_or_event" });
      else if (error) results.push({ eventId: e.eventId, result: "retryable_database_error" });
      else results.push({ eventId: e.eventId, result: "published" });
      continue;
    }

    const { data: existing } = await admin.from("trading_signals")
      .select("id,event_id,execution_status").eq("mentor_id", token.mentor_id).eq("setup_id", e.setupId).maybeSingle();
    if (!existing) { results.push({ eventId: e.eventId, result: "status_before_publication_ignored" }); continue; }

    const patch: Record<string, unknown> = {
      raw_event: { event: e, status_event: e },
    };
    if (e.eventType === EVENT.EXPIRED) patch.status = "EXPIRED";
    if (e.eventType === EVENT.INVALIDATED) patch.status = "INVALIDATED";
    if (e.eventType === EVENT.REJECTED) patch.status = "REJECTED";
    if (e.eventType === EVENT.EXECUTED) {
      patch.execution_status = "EXECUTED";
      patch.execution_event_id = e.eventId;
    }
    const { error } = await admin.from("trading_signals").update(patch).eq("id", existing.id);
    results.push({ eventId: e.eventId, result: error ? "retryable_database_error" : "status_updated" });
  }

  await admin.from("mentor_bot_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);
  return NextResponse.json({ ok: true, results }, { status: 200 });
}
