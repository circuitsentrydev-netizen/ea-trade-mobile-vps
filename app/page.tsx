import Link from "next/link";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Bot, ChevronDown,
  CircleHelp, Command, Cpu, Gauge, LayoutDashboard, LifeBuoy,
  Plus, Radio, Settings2, ShieldCheck, Signal, Sparkles, WalletCards
} from "lucide-react";

const metrics = [
  { label: "Total equity", value: "$10,482.60", change: "+4.82%", positive: true, icon: WalletCards },
  { label: "Running instances", value: "02", change: "1 demo · 1 live", positive: true, icon: Cpu },
  { label: "Execution health", value: "98.6%", change: "Sample telemetry", positive: true, icon: Signal },
  { label: "Queued jobs", value: "01", change: "Worker not connected", positive: false, icon: Activity }
];

const activity = [
  { time: "12:42:13", title: "Qualified setup", detail: "SMC-7F2A · XAUUSD · M5", status: "PENDING", tone: "amber" },
  { time: "12:42:11", title: "Structure break", detail: "Bullish CHoCH confirmed", status: "PASSED", tone: "green" },
  { time: "12:42:08", title: "Liquidity sweep", detail: "Buy-side liquidity reclaimed", status: "PASSED", tone: "green" }
];

const nav = [
  { label: "Overview", href: "/", icon: LayoutDashboard, active: true },
  { label: "Telemetry", href: "/dashboard/telemetry", icon: Activity },
  { label: "Mentor workspace", href: "/dashboard/mentor", icon: ShieldCheck },
  { label: "Account settings", href: "/dashboard/account", icon: Settings2 }
];

function Metric({ item }: { item: (typeof metrics)[number] }) {
  const Icon = item.icon;
  return <article className="metric-card">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-400">{item.label}</p>
      <span className="icon-tile"><Icon size={17} /></span>
    </div>
    <p className="mt-5 text-[1.8rem] font-semibold tracking-tight text-white">{item.value}</p>
    <p className={`mt-2 flex items-center gap-1.5 text-xs ${item.positive ? "text-emerald-400" : "text-amber-300"}`}>
      {item.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{item.change}
    </p>
  </article>;
}

function StatusPill({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "blue" }) {
  return <span className={`status-pill status-${tone}`}><span className="status-dot" />{children}</span>;
}

export default function HomePage() {
  return <div className="app-shell">
    <aside className="desktop-sidebar">
      <Link href="/" className="brand-lockup">
        <span className="brand-mark"><Command size={21} /></span>
        <span><strong>EA Trade</strong><small>HOSTING CONSOLE</small></span>
      </Link>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {nav.map(({ label, href, icon: Icon, active }) => <Link key={label} href={href} className={active ? "nav-link nav-link-active" : "nav-link"}>
          <Icon size={18} strokeWidth={1.8} />{label}
        </Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><span className="help-icon"><LifeBuoy size={17}/></span><strong>Need a hand?</strong><p>Explore the platform guide and setup steps.</p><Link href="/help">Visit help centre <span>↗</span></Link></div>
        <div className="sidebar-user"><div className="avatar">FF</div><div className="min-w-0"><strong>Workspace preview</strong><small>Demo environment</small></div><ChevronDown size={15} className="ml-auto text-slate-500"/></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar">
        <div className="flex items-center gap-2 text-sm text-slate-400"><span className="hidden sm:inline">Workspace</span><span className="hidden sm:inline text-slate-600">/</span><span className="font-medium text-slate-200">Overview</span></div>
        <div className="flex items-center gap-2 sm:gap-3">
          <StatusPill tone="amber">SIMULATION MODE</StatusPill>
          <button className="top-icon" aria-label="Notifications"><Bell size={18}/><i /></button>
          <div className="top-avatar">FF</div>
        </div>
      </header>

      <div className="page-content">
        <section className="page-heading">
          <div><p className="eyebrow">MONITORING CENTRE</p><h1>Good afternoon.</h1><p className="mt-2 text-sm text-slate-400">Here’s what’s happening across your trading workspace.</p></div>
          <Link href="/dashboard/instances/new" className="primary-button"><Plus size={17}/> Add robot</Link>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.map((item) => <Metric key={item.label} item={item}/>)}
        </section>

        <section className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
          <div className="surface-card overflow-hidden">
            <div className="section-header"><div><p className="eyebrow">YOUR ENVIRONMENT</p><h2>Hosted robots</h2></div><Link href="/dashboard/instances" className="text-sm font-medium text-blue-400 hover:text-blue-300">View all <span>→</span></Link></div>
            <div className="robot-row">
              <div className="robot-symbol"><Bot size={22}/></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3>SMC Sniper Scalp</h3><StatusPill>RUNNING</StatusPill></div><p className="mt-1.5 text-xs text-slate-400">Build v1.06 <span className="mx-1.5 text-slate-600">·</span> XAUUSD <span className="mx-1.5 text-slate-600">·</span> M5</p><p className="mt-2 text-[11px] text-slate-500">Demo instance · sample values</p></div>
              <div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Account equity</p><p className="mt-1 font-semibold text-white">$10,482.60</p><p className="mt-1 text-xs text-emerald-400">+$482.60</p></div>
              <button className="more-button" aria-label="Robot options">···</button>
            </div>
            <div className="robot-row">
              <div className="robot-symbol robot-symbol-muted"><Bot size={22}/></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3>Volatility Guardian</h3><StatusPill tone="amber">STOPPED</StatusPill></div><p className="mt-1.5 text-xs text-slate-400">Build v0.9 <span className="mx-1.5 text-slate-600">·</span> Volatility 75 <span className="mx-1.5 text-slate-600">·</span> M1</p><p className="mt-2 text-[11px] text-slate-500">Demo instance · sample values</p></div>
              <div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Last known equity</p><p className="mt-1 font-semibold text-white">$2,500.00</p><p className="mt-1 text-xs text-slate-500">No active session</p></div>
              <button className="more-button" aria-label="Robot options">···</button>
            </div>
            <div className="px-5 py-4"><Link href="/dashboard/instances/new" className="add-row"><Plus size={16}/> Connect another robot</Link></div>
          </div>

          <div className="surface-card">
            <div className="section-header"><div><p className="eyebrow">SYSTEM STATUS</p><h2>Infrastructure</h2></div><span className="icon-tile"><Gauge size={17}/></span></div>
            <div className="px-5 pb-5">
              <div className="infra-status"><span className="infra-icon"><Cpu size={18}/></span><div className="flex-1"><strong>VPS execution worker</strong><p>Phase 2 connection pending</p></div><StatusPill tone="amber">OFFLINE</StatusPill></div>
              <div className="infra-status"><span className="infra-icon"><ShieldCheck size={18}/></span><div className="flex-1"><strong>Application security</strong><p>Authentication setup in progress</p></div><StatusPill tone="blue">SETUP</StatusPill></div>
              <div className="infra-status"><span className="infra-icon"><Radio size={18}/></span><div className="flex-1"><strong>Execution mode</strong><p>No broker connection is active</p></div><StatusPill tone="amber">MOCK</StatusPill></div>
              <div className="mt-4 rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-3.5"><div className="flex items-center gap-2 text-sm font-medium text-blue-200"><Sparkles size={15}/> Getting started</div><p className="mt-1.5 text-xs leading-5 text-slate-400">Connect Supabase to enable secure sign-in, account storage and mentor licensing.</p><Link href="/setup" className="mt-2 inline-flex text-xs font-semibold text-blue-300">Setup checklist →</Link></div>
            </div>
          </div>
        </section>

        <section className="surface-card mt-5">
          <div className="section-header"><div><p className="eyebrow">STATE ENGINE JOURNAL</p><h2>Latest SMC activity</h2><p className="mt-1 text-xs text-slate-500">Illustrative events only · not live market signals</p></div><Link href="/dashboard/telemetry" className="text-sm font-medium text-blue-400">Open journal →</Link></div>
          <div className="divide-y divide-white/[0.055]">
            {activity.map((event, index) => <div key={event.time} className="flex items-center gap-3 px-5 py-4 sm:gap-4">
              <span className="event-index">{String(index + 1).padStart(2,"0")}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{event.title}</p><p className="mt-1 truncate text-xs text-slate-500">{event.detail}</p></div>
              <span className={event.tone === "green" ? "event-state event-state-green" : "event-state event-state-amber"}>{event.status}</span>
              <time className="hidden font-mono text-xs text-slate-500 sm:block">{event.time} UTC</time>
            </div>)}
          </div>
        </section>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/10 bg-amber-400/[0.045] px-4 py-3 text-xs leading-5 text-slate-400"><CircleHelp size={15} className="mt-0.5 shrink-0 text-amber-300"/> This preview uses illustrative sample data. Robot controls are not connected to a trading terminal, and no orders can be placed from this dashboard.</div>
      </div>
    </main>
  </div>;
}
