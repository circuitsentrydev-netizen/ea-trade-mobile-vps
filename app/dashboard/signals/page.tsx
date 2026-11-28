import { redirect } from "next/navigation";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Activity, ShieldAlert } from "lucide-react";

type Signal = {
  id: string; symbol: string; direction: "BUY" | "SELL";
  entry_price: number | string | null; stop_loss: number | string | null; take_profit: number | string | null;
  status: string; execution_status: string; published_at: string; expires_at: string | null; notes: string | null;
  timeframe: string | null; source_utc: string | null; confirmed_utc: string | null;
  zone_low: number | string | null; zone_high: number | string | null; ea_version: string | null; journal_schema_version: string | null;
};

function price(value: number | string | null) {
  if (value === null || value === undefined) return "Not supplied";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 8 }) : "Not supplied";
}
function signalLabel(status: string, schema: string | null) {
  if (status === "ACTIVE") return schema === "V3" ? "QUALIFIED · PUBLISHED" : "MENTOR PUBLISHED";
  return status.replaceAll("_", " ");
}
function executionLabel(status: string) {
  if (status === "PENDING") return "EXECUTION PENDING (reported by EA)";
  if (status === "EXECUTED") return "EXECUTED (reported by EA)";
  if (status === "CLOSED") return "CLOSED (reported by EA)";
  if (status === "NOT_EXECUTED") return "NOT EXECUTED (confirmed by EA)";
  return "NOT CONFIRMED";
}

export default async function SignalsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("trading_signals")
    .select("id,symbol,direction,entry_price,stop_loss,take_profit,status,execution_status,published_at,expires_at,notes,timeframe,source_utc,confirmed_utc,zone_low,zone_high,ea_version,journal_schema_version")
    .order("published_at", { ascending: false }).limit(100);
  const signals = (data ?? []) as Signal[];

  return <SectionPage eyebrow="MENTOR MARKET FEED" title="Signals" description="Qualified setups published by your mentor's SMC robot. Publication and broker execution are tracked separately.">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-white">Published signals</p><p className="mt-1 text-xs text-slate-400">{signals.length} recent signal(s)</p></div>
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> LIVE FEED</span>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">Signals could not be loaded. Check the journal signals migration and database permissions.</p>}
    {!error && signals.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-400/10 text-blue-300"><Activity size={22}/></span><h3 className="mt-4 text-sm font-semibold text-white">No qualified signals published yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Only SMC_EVT_QUALIFIED events from your linked mentor&apos;s EA appear here. Intermediate SMC events are never shown as trade signals.</p></div>}
    <div className="grid gap-3">
      {signals.map(signal => <article key={signal.id} className="rounded-2xl border border-white/[0.07] bg-[#101827] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${signal.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{signal.direction}</span><h2 className="text-base font-semibold tracking-wide text-slate-100">{signal.symbol}</h2></div>
          <span className={`text-xs font-semibold ${signal.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}`}>{signalLabel(signal.status, signal.journal_schema_version)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-black/20 p-3 sm:grid-cols-3">
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">TIMEFRAME</p><p className="mt-1 text-sm text-slate-100">{signal.timeframe ?? "—"}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ZONE LOW</p><p className="mt-1 text-sm tabular-nums text-slate-100">{price(signal.zone_low)}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ZONE HIGH</p><p className="mt-1 text-sm tabular-nums text-slate-100">{price(signal.zone_high)}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ENTRY</p><p className="mt-1 text-xs text-slate-300">{price(signal.entry_price)}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">STOP LOSS</p><p className="mt-1 text-xs text-slate-300">{price(signal.stop_loss)}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">TAKE PROFIT</p><p className="mt-1 text-xs text-slate-300">{price(signal.take_profit)}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">EA EXECUTION STATUS</p><p className="mt-1 text-xs font-semibold text-slate-200">{executionLabel(signal.execution_status)}</p></div>
          <span className="text-[10px] text-slate-500">{signal.journal_schema_version === "V3" ? `EA release ${signal.ea_version ?? "—"} · journal V3` : "Mentor signal"}</span>
        </div>
        {signal.notes && <p className="mt-3 text-xs leading-5 text-slate-400">{signal.notes}</p>}
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500"><span>Source UTC: {signal.source_utc ? new Date(signal.source_utc).toISOString() : "—"}</span><span>Confirmed UTC: {signal.confirmed_utc ? new Date(signal.confirmed_utc).toISOString() : "—"}</span></div>
      </article>)}
    </div>
    <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-5 text-amber-100/80"><ShieldAlert size={15} className="mt-0.5 shrink-0"/> A published signal is a qualified trade setup, not proof that a broker order was placed. Execution is shown only when a matching EA execution event is received.</div>
  </SectionPage>;
}
