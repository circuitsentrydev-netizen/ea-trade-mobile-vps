import { redirect } from "next/navigation";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendingUp, ShieldAlert } from "lucide-react";

type Signal = {
  id: string; symbol: string; direction: "BUY" | "SELL";
  entry_price: number | string; stop_loss: number | string; take_profit: number | string;
  status: string; published_at: string; expires_at: string | null; notes: string | null;
};

function price(value: number | string) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 8 }) : "—";
}

export default async function SignalsPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase.from("trading_signals")
    .select("id,symbol,direction,entry_price,stop_loss,take_profit,status,published_at,expires_at,notes")
    .order("published_at", { ascending: false }).limit(100);
  const signals = (data ?? []) as Signal[];

  return <SectionPage eyebrow="MENTOR MARKET FEED" title="Signals" description="Trades published by your mentor. Review entry, stop-loss and target levels before making any decision.">
    <div className="mb-5 flex items-center justify-between gap-3">
      <div><p className="text-sm font-semibold text-white">Published signals</p><p className="mt-1 text-xs text-slate-400">{signals.length} recent signal(s)</p></div>
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-semibold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> LIVE FEED</span>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">Signals could not be loaded. The new signals migration must be applied before this feed can display data.</p>}
    {!error && signals.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-400/10 text-blue-300"><TrendingUp size={22}/></span><h3 className="mt-4 text-sm font-semibold text-white">No signals published yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">When your approved mentor publishes a trade idea, it will appear here with its entry, stop-loss, target and status.</p></div>}
    <div className="grid gap-3">
      {signals.map((signal) => <article key={signal.id} className="rounded-2xl border border-white/[0.07] bg-[#101827] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${signal.direction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>{signal.direction}</span><h2 className="text-base font-semibold tracking-wide text-slate-100">{signal.symbol}</h2></div>
          <span className={`text-xs font-medium ${signal.status === "ACTIVE" ? "text-emerald-300" : "text-slate-400"}`}>{signal.status.toLowerCase().replace("_", " ")}</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ENTRY</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-100">{price(signal.entry_price)}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">STOP LOSS</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-100">{price(signal.stop_loss)}</p></div>
          <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">TARGET</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-100">{price(signal.take_profit)}</p></div>
        </div>
        {signal.notes && <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs leading-5 text-slate-400">{signal.notes}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><time dateTime={signal.published_at}>{new Date(signal.published_at).toLocaleString()}</time>{signal.expires_at && <span>Expires {new Date(signal.expires_at).toLocaleString()}</span>}</div>
      </article>)}
    </div>
    <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-5 text-amber-100/80"><ShieldAlert size={15} className="mt-0.5 shrink-0"/> Signals are informational. They do not automatically place trades. Always verify prices and risk before acting.</div>
  </SectionPage>;
}
