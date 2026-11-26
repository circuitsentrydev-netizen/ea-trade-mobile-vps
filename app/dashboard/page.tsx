import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowUpRight, Bot, LogOut, Plus, Radio, ShieldCheck, Square, Play } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth-actions";
import { requestInstanceAction } from "@/app/dashboard/instances/control-actions";

type Account = { id: string; label: string; broker_server: string; account_mode: string; symbol: string; timeframe: string; status: string };

export default async function DashboardPage({ searchParams }: { searchParams?: { queued?: string; error?: string; message?: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile }, { data: accounts }, { count: signalCount }, { count: pendingJobs }] = await Promise.all([
    supabase.from("profiles").select("display_name,role").eq("id", user.id).maybeSingle(),
    supabase.from("mt5_accounts").select("id,label,broker_server,account_mode,symbol,timeframe,status").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("trading_signals").select("id", { count: "exact", head: true }).neq("status", "CANCELLED"),
    supabase.from("vps_jobs").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("status", "PENDING")
  ]);
  const name = profile?.display_name || user.email?.split("@")[0] || "Trader";
  const robots = (accounts ?? []) as Account[];
  const running = robots.filter(a => a.status === "RUNNING").length;
  const cards = [
    { href: "/dashboard/signals", label: "Signals", detail: "Trades published by your mentor", icon: Radio, value: String(signalCount ?? 0) },
    { href: "/dashboard/telemetry", label: "Execution journal", detail: "SMC state and worker events", icon: Activity, value: "Open" },
    { href: "/dashboard/instances", label: "All robot instances", detail: "Manage connected MT5 accounts", icon: Bot, value: String(robots.length) }
  ];
  return <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">TRADING CONTROL CENTRE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Welcome, {name}</h1><p className="mt-2 text-sm text-slate-400">Start and monitor your robot, and follow your mentor's signals.</p></div><div className="flex flex-wrap items-center gap-2">{profile?.role === "SUPERADMIN" && <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-400/[0.06] px-3 text-sm text-blue-200 hover:bg-blue-400/10"><ShieldCheck size={15}/> Admin console</Link>}<form action={signOutAction}><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5"><LogOut size={15}/> Sign out</button></form></div></div>
    {(searchParams?.queued || searchParams?.error || searchParams?.message) && <div role="status" className={`mt-5 rounded-xl border p-3 text-sm ${searchParams.error ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-200" : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"}`}>{searchParams.error || searchParams.message || "Control request queued. Waiting for the Windows MT5 worker to process it."}</div>}
    <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="surface-card p-4"><p className="text-[10px] font-semibold tracking-wider text-slate-500">ROBOTS</p><p className="mt-2 text-2xl font-semibold text-white">{robots.length}</p><p className="mt-1 text-[11px] text-slate-500">Registered accounts</p></div>
      <div className="surface-card p-4"><p className="text-[10px] font-semibold tracking-wider text-slate-500">RUNNING</p><p className="mt-2 text-2xl font-semibold text-emerald-300">{running}</p><p className="mt-1 text-[11px] text-slate-500">Worker-confirmed</p></div>
      <div className="surface-card p-4"><p className="text-[10px] font-semibold tracking-wider text-slate-500">PENDING JOBS</p><p className="mt-2 text-2xl font-semibold text-blue-300">{pendingJobs ?? 0}</p><p className="mt-1 text-[11px] text-slate-500">Awaiting worker</p></div>
      <div className="surface-card p-4"><p className="text-[10px] font-semibold tracking-wider text-slate-500">ACTIVE SIGNALS</p><p className="mt-2 text-2xl font-semibold text-white">{signalCount ?? 0}</p><p className="mt-1 text-[11px] text-slate-500">Mentor market feed</p></div>
    </section>
    <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5"><div><p className="eyebrow">YOUR AUTOMATION</p><h2 className="mt-1 text-base font-semibold text-white">My robots</h2></div><Link href="/dashboard/instances/new" className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400"><Plus size={14}/> Add robot</Link></div>
      {!robots.length ? <div className="px-5 py-10 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-400/10 text-blue-300"><Bot size={21}/></span><h3 className="mt-3 text-sm font-semibold text-white">No robot connected yet</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400">Connect an MT5 DEMO account to register your first robot instance.</p><Link href="/dashboard/instances/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white"><Plus size={14}/> Connect MT5 account</Link></div> :
      <div>{robots.map(robot => <article key={robot.id} className="border-b border-white/[0.055] px-4 py-4 last:border-0 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><Bot size={19}/></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-100">{robot.label}</h3><p className="mt-1 text-xs text-slate-400">{robot.symbol} · {robot.timeframe} · {robot.account_mode} · {robot.broker_server}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${robot.status === "RUNNING" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : robot.status === "QUEUED" || robot.status === "COMPILING" ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300" : "border-slate-400/15 bg-slate-400/[0.05] text-slate-300"}`}>{robot.status}</span></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {robot.status !== "RUNNING" && robot.status !== "QUEUED" && robot.status !== "COMPILING" && <form action={requestInstanceAction}><input type="hidden" name="accountId" value={robot.id}/><input type="hidden" name="intent" value="START_INSTANCE"/><button className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"><Play size={13}/> Start bot</button></form>}
          {robot.status === "RUNNING" && <form action={requestInstanceAction}><input type="hidden" name="accountId" value={robot.id}/><input type="hidden" name="intent" value="STOP_INSTANCE"/><button className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"><Square size={12}/> Stop bot</button></form>}
          {(robot.status === "QUEUED" || robot.status === "COMPILING") && <span className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500/10 px-3 text-xs text-amber-200">Queued · awaiting worker</span>}
          <Link href="/dashboard/instances" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5">Manage <ArrowUpRight size={13}/></Link>
        </div>
      </article>)}</div>}
    </section>
    <section className="mt-7 grid gap-3 sm:grid-cols-3">{cards.map(({href,label,detail,icon:Icon,value})=><Link key={href} href={href} className="surface-card flex items-center gap-3 p-4 transition hover:border-blue-400/30"><span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><Icon size={19}/></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-100">{label}</strong><span className="mt-1 block text-[11px] text-slate-400">{detail}</span></span><span className="text-sm font-semibold text-slate-300">{value}</span></Link>)}</section>
    <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-xs leading-5 text-amber-100/80"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> Start and stop buttons create authenticated VPS jobs. A Windows MT5 worker must process them; queued is not confirmation that a terminal has started or stopped. This dashboard does not place live trades.</div>
  </main>;
}
