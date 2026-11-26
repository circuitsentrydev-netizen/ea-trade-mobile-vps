import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, UserRound, XCircle, Radio, PlusCircle } from "lucide-react";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishSignalAction, updateSignalStatusAction } from "./actions";
import { MentorBotConnection } from "./mentor-bot-connection";

type Props = { searchParams?: { error?: string; published?: string; updated?: string } };

export default async function MentorPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profileError || !profile) return <SectionPage eyebrow="MENTOR WORKSPACE" title="Mentor access"><p role="alert" className="text-sm text-rose-200">Could not verify account permissions.</p></SectionPage>;

  const { data: application } = await supabase.from("mentor_applications")
    .select("status,submitted_at,reviewed_at,review_note").eq("user_id", user.id).maybeSingle();
  const approved = profile.role === "MENTOR_ADMIN" && profile.mentor_approved;
  const superadmin = profile.role === "SUPERADMIN";
  const { data: signals } = approved ? await supabase.from("trading_signals")
    .select("id,symbol,direction,entry_price,stop_loss,take_profit,status,published_at,expires_at")
    .eq("mentor_id", user.id).order("published_at", { ascending: false }).limit(50) : { data: [] };
  const status = approved ? "APPROVED" : application?.status ?? "NOT_SUBMITTED";

  return <SectionPage eyebrow="MENTOR WORKSPACE" title="Mentor signal desk" description="Publish trade ideas to your assigned clients. Publishing a signal does not place a broker trade.">
    {searchParams?.error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{searchParams.error}</p>}
    {searchParams?.published && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">Signal published successfully.</p>}
    {searchParams?.updated && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">Signal status updated.</p>}
    {!approved ? <div className="surface-card p-5">
      <div className="flex items-center gap-2">{status === "REJECTED" ? <XCircle className="text-rose-300"/> : status === "APPROVED" ? <ShieldCheck className="text-emerald-300"/> : <Clock3 className="text-amber-300"/>}<h2 className="text-sm font-semibold text-white">{status === "PENDING" ? "Application pending review" : status === "REJECTED" ? "Application not approved" : "Mentor access not active"}</h2></div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{status === "PENDING" ? "Your mentor application is awaiting Superadmin review. Publishing tools will unlock after approval." : status === "REJECTED" ? "Your application was not approved. Contact the platform administrator if you need clarification." : "Your account does not currently have approved mentor permissions."}</p>
      {application?.submitted_at && <p className="mt-3 text-xs text-slate-500">Submitted {new Date(application.submitted_at).toLocaleString()}</p>}
      {application?.review_note && <p className="mt-3 text-xs text-slate-300">Review note: {application.review_note}</p>}
    </div> : <div className="grid gap-5">
      <MentorBotConnection />
      <div className="surface-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2"><PlusCircle size={18} className="text-blue-300"/><h2 className="text-base font-semibold text-white">Publish a trading signal</h2></div>
        <form action={publishSignalAction} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-300">Symbol<input name="symbol" required maxLength={24} placeholder="XAUUSD" className="field-input"/></label>
          <label className="grid gap-2 text-xs text-slate-300">Direction<select name="direction" className="field-input"><option value="BUY">BUY</option><option value="SELL">SELL</option></select></label>
          <label className="grid gap-2 text-xs text-slate-300">Entry price<input name="entry" type="number" min="0.00000001" step="any" required className="field-input"/></label>
          <label className="grid gap-2 text-xs text-slate-300">Stop-loss<input name="stopLoss" type="number" min="0.00000001" step="any" required className="field-input"/></label>
          <label className="grid gap-2 text-xs text-slate-300">Take-profit / target<input name="takeProfit" type="number" min="0.00000001" step="any" required className="field-input"/></label>
          <label className="grid gap-2 text-xs text-slate-300">Signal expiry<select name="expiryHours" defaultValue="24" className="field-input"><option value="4">4 hours</option><option value="8">8 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option><option value="0">No expiry</option></select></label>
          <label className="grid gap-2 text-xs text-slate-300 sm:col-span-2">Mentor notes<textarea name="notes" maxLength={500} rows={3} placeholder="Optional setup context, confirmation or invalidation..." className="field-input"/></label>
          <button type="submit" className="min-h-11 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white hover:bg-blue-400 sm:col-span-2">Publish signal to clients</button>
        </form>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">BUY requires stop-loss below entry and target above entry. SELL requires stop-loss above entry and target below entry. Clients receive this as information only; it does not execute trades.</p>
      </div>
      <div><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Your published signals</h2><span className="text-xs text-slate-500">{signals?.length ?? 0} recent</span></div>
      {!signals?.length ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">You have not published any signals yet.</p> : <div className="grid gap-3">{signals.map(s => <article key={s.id} className="surface-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${s.direction === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{s.direction}</span><strong className="text-sm text-white">{s.symbol}</strong></div><span className="text-xs text-slate-400">{s.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div><p className="text-slate-500">ENTRY</p><p className="mt-1 text-slate-200">{s.entry_price}</p></div><div><p className="text-slate-500">STOP</p><p className="mt-1 text-slate-200">{s.stop_loss}</p></div><div><p className="text-slate-500">TARGET</p><p className="mt-1 text-slate-200">{s.take_profit}</p></div></div>{s.status === "ACTIVE" && <form action={updateSignalStatusAction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="signalId" value={s.id}/><button name="status" value="CANCELLED" className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-300">Cancel signal</button><button name="status" value="HIT_TP" className="rounded-lg border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300">Mark target hit</button><button name="status" value="HIT_SL" className="rounded-lg border border-amber-400/20 px-3 py-2 text-xs text-amber-300">Mark stop hit</button></form>}</article>)}</div>}</div>
    </div>}
    {superadmin && <p className="mt-5 text-xs text-slate-500">Superadmin account detected. Use the platform administration console for mentor approvals.</p>}
  </SectionPage>;
}
