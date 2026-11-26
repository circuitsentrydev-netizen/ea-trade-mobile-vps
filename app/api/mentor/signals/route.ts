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
  configVersion: number;
  valid: boolean;
  reason: string;
  checksum: number;
  eaVersion: string;
  journalSchemaVersion: string;
  rawLine: string;
};

// Values are the source EA's ENUM_SMC_EVENT ordinal values (v1.082).
const EVENT = {
  CREATED: 0, LIQUIDITY: 1, SWEEP: 2, RECLAIM: 3, DISPLACEMENT: 4,
  STRUCTURE: 5, ZONE: 6, MITIGATION: 7, REJECTION_STAGE: 8, LTF_CHOCH: 9,
  QUALIFIED: 10, EXECUTION_PENDING: 11, REJECTED: 12, EXPIRED: 13,
  EXECUTED: 14, INVALIDATED: 15, CLOSED: 16,
} as const;

const EVENT_NAMES: Record<number, string> = {
  0: "SMC_EVT_CREATED", 1: "SMC_EVT_LIQUIDITY", 2: "SMC_EVT_SWEEP",
  3: "SMC_EVT_RECLAIM", 4: "SMC_EVT_DISPLACEMENT", 5: "SMC_EVT_STRUCTURE",
  6: "SMC_EVT_ZONE", 7: "SMC_EVT_MITIGATION", 8: "SMC_EVT_REJECTION",
  9: "SMC_EVT_LTF_CHOCH", 10: "SMC_EVT_QUALIFIED",
  11: "SMC_EVT_EXECUTION_PENDING", 12: "SMC_EVT_REJECTED",
  13: "SMC_EVT_EXPIRED", 14: "SMC_EVT_EXECUTED",
  15: "SMC_EVT_INVALIDATED", 16: "SMC_EVT_CLOSED",
};

const validJournalTime = (value: string) =>
  /^\\d{4}\\.\\d{2}\\.\\d{2} \\d{2}:\\d{2}:\\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value.replace(/^(\\d{4})\\.(\\d{2})\\.(\\d{2}) /, "$1-$2-$3T") + "Z"));

function parseSemicolonCsv(line: string): string[] | null {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ";" && !quoted) {
      fields.push(field); field = "";
    } else field += ch;
  }
  if (quoted) return null;
  fields.push(field);
  return fields;
}

// Mirrors CSetupJournal::Checksum in SMC_EA_SniperScalp v1.082.
// StringGetCharacter returns UTF-16 code units; JS charCodeAt does the same.
// Math.imul preserves the source uint32 overflow behavior.
function journalChecksum(fields: string[]): number {
  const payload = [
    fields[1], fields[2], fields[3], fields[4], fields[5], fields[6],
    fields[7], fields[8], fields[9], fields[10], fields[11], fields[12],
    fields[13], fields[14], fields[15], fields[16],
  ].join("|");
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toIsoUtc(value: string): string {
  return new Date(value.replace(/^(\\d{4})\\.(\\d{2})\\.(\\d{2}) /, "$1-$2-$3T") + "Z").toISOString();
}

function validateEvent(e: JournalEvent): string | null {
  if (!e || !/^\\d{1,19}$/.test(String(e.eventId)) ||
      !/^\\d{1,19}$/.test(String(e.parentEventId)) ||
      !/^\\d{1,19}$/.test(String(e.setupId))) return "invalid_identity";
  if (e.journalSchemaVersion !== "V3" || e.configVersion !== 108 ||
      !/^[A-Z0-9._-]{2,24}$/.test(e.symbol) ||
      !["BUY", "SELL"].includes(e.direction) ||
      !/^PERIOD_[A-Z0-9]+$/.test(e.timeframe) ||
      !Number.isInteger(e.eventType) || e.eventType < EVENT.CREATED || e.eventType > EVENT.CLOSED ||
      !Number.isFinite(e.zoneLow) || !Number.isFinite(e.zoneHigh) ||
      e.zoneLow < 0 || e.zoneHigh < e.zoneLow ||
      !validJournalTime(e.sourceUtc) || !validJournalTime(e.confirmedUtc) ||
      !validJournalTime(e.sourceBrokerTime) || !validJournalTime(e.confirmedBrokerTime) ||
      typeof e.valid !== "boolean" || !e.valid ||
      typeof e.reason !== "string" || e.reason.length > 2000 ||
      !/^\\d+\\.\\d+$/.test(e.eaVersion) ||
      !Number.isInteger(e.checksum) || e.checksum < 0 || e.checksum > 4294967295 ||
      typeof e.rawLine !== "string" || e.rawLine.length > 12000) return "invalid_record";

  const fields = parseSemicolonCsv(e.rawLine);
  if (!fields || fields.length !== 18 || fields[0] !== "V3") return "invalid_raw_journal_row";
  if (fields[1] !== e.eventId || fields[2] !== e.parentEventId || fields[3] !== e.setupId ||
      fields[4] !== e.symbol || fields[5] !== (e.direction === "BUY" ? "1" : "-1") ||
      fields[6] !== e.timeframe || Number(fields[7]) !== e.eventType ||
      fields[8] !== e.sourceUtc || fields[9] !== e.confirmedUtc ||
      fields[10] !== e.sourceBrokerTime || fields[11] !== e.confirmedBrokerTime ||
      Number(fields[12]) !== e.zoneLow || Number(fields[13]) !== e.zoneHigh ||
      fields[14] !== "108" || fields[15] !== "1" || fields[16] !== e.reason ||
      Number(fields[17]) !== e.checksum) return "payload_raw_row_mismatch";

  if (journalChecksum(fields) !== e.checksum) return "checksum_mismatch";
  return null;
}

export async function POST(request: NextRequest) {
  // Real ingestion stays disabled until a real MT5 V3 row has been checksum-verified.
  if (process.env.SMC_V3_REAL_JOURNAL_VERIFIED !== "true") {
    return NextResponse.json({ error: "real_journal_verification_required" }, { status: 503 });
  }

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
  let retryableFailure = false;

  for (const e of body.events) {
    const validationError = validateEvent(e);
    if (validationError) { results.push({ eventId: String(e?.eventId ?? ""), result: validationError }); continue; }

    const sourceAt = toIsoUtc(e.sourceUtc);
    const confirmedAt = toIsoUtc(e.confirmedUtc);
    const { error: auditError } = await admin.from("trading_signal_events").insert({
      mentor_id: token.mentor_id, event_id: e.eventId, setup_id: e.setupId,
      event_type: e.eventType, event_type_name: EVENT_NAMES[e.eventType],
      event_utc: confirmedAt, raw_event: e,
    });
    if (auditError && auditError.code !== "23505") {
      results.push({ eventId: e.eventId, result: "retryable_database_error" });
      retryableFailure = true;
      continue;
    }

    if (e.eventType === EVENT.QUALIFIED) {
      const { error } = await admin.from("trading_signals").insert({
        mentor_id: token.mentor_id, event_id: e.eventId, setup_id: e.setupId,
        symbol: e.symbol, direction: e.direction, timeframe: e.timeframe,
        source_utc: sourceAt, confirmed_utc: confirmedAt,
        zone_low: e.zoneLow, zone_high: e.zoneHigh,
        notes: e.reason || null, ea_version: e.eaVersion,
        journal_schema_version: "V3", raw_event: e,
        entry_price: null, stop_loss: null, take_profit: null,
        status: "ACTIVE", execution_status: "NOT_CONFIRMED",
      });
      if (error?.code === "23505") results.push({ eventId: e.eventId, result: "duplicate_setup_or_event" });
      else if (error) {
        results.push({ eventId: e.eventId, result: "retryable_database_error" });
        retryableFailure = true;
      } else results.push({ eventId: e.eventId, result: "published" });
      continue;
    }

    // Every non-qualified event is audit-only. It can never create a signal.
    const { data: existing } = await admin.from("trading_signals")
      .select("id").eq("mentor_id", token.mentor_id).eq("setup_id", e.setupId).maybeSingle();
    if (!existing) { results.push({ eventId: e.eventId, result: "status_before_publication_ignored" }); continue; }

    const patch: Record<string, unknown> = { latest_status_event: e };
    if (e.eventType === EVENT.REJECTED) patch.status = "REJECTED";
    if (e.eventType === EVENT.EXPIRED) patch.status = "EXPIRED";
    if (e.eventType === EVENT.INVALIDATED) patch.status = "INVALIDATED";
    if (e.eventType === EVENT.EXECUTION_PENDING) patch.execution_status = "PENDING";
    if (e.eventType === EVENT.EXECUTED) {
      patch.execution_status = "EXECUTED";
      patch.execution_event_id = e.eventId;
    }
    if (e.eventType === EVENT.CLOSED) patch.execution_status = "CLOSED";

    const { error } = await admin.from("trading_signals").update(patch).eq("id", existing.id);
    if (error) {
      results.push({ eventId: e.eventId, result: "retryable_database_error" });
      retryableFailure = true;
    } else results.push({ eventId: e.eventId, result: "status_updated" });
  }

  await admin.from("mentor_bot_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);
  return NextResponse.json({ ok: !retryableFailure, results }, { status: retryableFailure ? 503 : 200 });
}
