import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Plus, Server, ShieldCheck } from "lucide-react";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { searchParams?: { created?: string } };

export default async function InstancesPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Never select password_ciphertext, password_iv or password_auth_tag.
  const { data: accounts, error } = await supabase
    .from("mt5_accounts")
    .select("id, label, login_id, broker_server, account_mode, symbol, timeframe, lot_size, status, is_personal_mentor_slot, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return <SectionPage eyebrow="HOSTING" title="Robot instances" description="Your registered MT5 accounts and hosting slots. Saving an account does not start a terminal or place trades.">
    {searchParams?.created && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200"><ShieldCheck size={17}/> MT5 account saved securely.</div>}
    {error && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">Unable to load your MT5 accounts. Please refresh.</p>}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-white">Connected accounts</h2><p className="mt-1 text-xs text-slate-400">{accounts?.length ?? 0} account(s) registered</p></div><Link href="/dashboard/instances/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"><Plus size={16}/> Add MT5 account</Link></div>
    {!accounts?.length ? <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-400/10 text-blue-300"><Bot size={22}/></span><h3 className="mt-4 text-sm font-semibold text-white">No MT5 accounts yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Register a DEMO account first. Your credentials are encrypted on the server and never displayed in this list.</p><Link href="/dashboard/instances/new" className="mt-5 inline-flex rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white">Connect your first account</Link></div> :
      <div className="grid gap-3">{accounts.map((account) => <article key={account.id} className="surface-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><Server size={18}/></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white">{account.label}</h3><p className="mt-1 text-xs text-slate-400">{account.broker_server} · Login {account.login_id}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${account.status === "RUNNING" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-slate-400/20 bg-slate-400/5 text-slate-300"}`}>{account.status}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4"><div><p className="text-[10px] text-slate-500">MODE</p><p className="mt-1 text-xs font-medium text-slate-200">{account.account_mode}</p></div><div><p className="text-[10px] text-slate-500">SYMBOL</p><p className="mt-1 text-xs font-medium text-slate-200">{account.symbol}</p></div><div><p className="text-[10px] text-slate-500">TIMEFRAME</p><p className="mt-1 text-xs font-medium text-slate-200">{account.timeframe}</p></div><div><p className="text-[10px] text-slate-500">LOT SIZE</p><p className="mt-1 text-xs font-medium text-slate-200">{account.lot_size}</p></div></div>{account.is_personal_mentor_slot && <p className="mt-3 text-xs text-emerald-300">Mentor personal hosting slot</p>}</article>)}</div>}
  </SectionPage>;
}
