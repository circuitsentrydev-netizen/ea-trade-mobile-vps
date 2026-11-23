import { redirect } from "next/navigation";
import { Activity, Clock3, ShieldAlert } from "lucide-react";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TelemetryPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: accounts } = await supabase.from("mt5_accounts").select("id,label,symbol").eq("owner_id", user.id);
  const accountIds = (accounts ?? []).map((account) => account.id);
  const { data: logs, error } = accountIds.length
    ? await supabase.from("telemetry_logs").select("id,account_id,setup_id,event_type,state,message,details,created_at").in("account_id", accountIds).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };

  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.label || account.symbol]));
  return <SectionPage eyebrow="STATE ENGINE JOURNAL" title="Telemetry & setup logs" description="Chronological records emitted by the EA worker. This page displays stored events only; it does not generate trading signals.">
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-400/15 bg-blue-400/[0.05] p-4"><Activity size={18} className="text-blue-300"/><div><p className="text-sm font-semibold text-white">Execution journal</p><p className="mt-1 text-xs text-slate-400">Showing up to the latest 100 events across your registered accounts.</p></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">Telemetry could not be loaded. Check database access and try again.</p>}
    {!logs?.length ? <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-400/10 text-slate-300"><Clock3 size={21}/></span><h3 className="mt-4 text-sm font-semibold text-white">No telemetry events yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">When an authorized MT5 worker is connected, its verified events will appear here in order: liquidity sweep, structure break, qualified state, preflight and execution acknowledgement.</p><div className="mx-auto mt-5 inline-flex items-center gap-2 text-xs text-amber-300"><ShieldAlert size={14}/> No worker is connected. No live execution is taking place.</div></div> :
      <div className="space-y-3">{logs.map((log) => <article key={log.id} className="surface-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-blue-400/15 bg-blue-400/[0.07] px-2 py-1 text-[10px] font-semibold text-blue-200">{log.event_type}</span><span className="text-xs text-slate-400">{accountNames.get(log.account_id) ?? "MT5 account"}</span></div><time className="text-[11px] text-slate-500" dateTime={log.created_at}>{new Date(log.created_at).toLocaleString()}</time></div><p className="mt-3 text-sm font-medium text-slate-100">{log.message}</p><div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span>State: {log.state}</span>{log.setup_id && <span>Setup: {log.setup_id}</span>}</div></article>)}</div>}
  </SectionPage>;
}
