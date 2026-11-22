import { Activity, ArrowDownRight, ArrowUpRight, Bot, Cpu, Plus, ShieldCheck, Wifi } from "lucide-react";

const metrics = [
  { label: "Account equity", value: "$10,482.60", change: "+2.4%", positive: true },
  { label: "Active instances", value: "02", change: "1 demo · 1 live", positive: true },
  { label: "Pending jobs", value: "01", change: "Worker offline", positive: false }
];

const events = [
  { time: "12:42:08", title: "Liquidity sweep detected", detail: "XAUUSD · M5 · Buy-side liquidity", state: "CONFIRMED" },
  { time: "12:42:11", title: "Structure break", detail: "Bullish CHoCH · displacement validated", state: "CONFIRMED" },
  { time: "12:42:13", title: "Central qualified state", detail: "Setup SMC-7F2A · waiting for preflight", state: "PENDING" }
];

function MetricCard({ label, value, change, positive }: (typeof metrics)[number]) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-panel p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-2 flex items-center gap-1 text-xs ${positive ? "text-success" : "text-amber-400"}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {change}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-blue-400"><Bot size={23} /></div>
          <div><p className="text-sm font-semibold tracking-wide">EA TRADE</p><p className="text-xs text-muted">MOBILE VPS CONTROL</p></div>
        </div>
        <button aria-label="Security status" className="rounded-full border border-success/20 bg-success/10 p-2.5 text-success"><ShieldCheck size={19} /></button>
      </header>

      <section className="mt-8">
        <p className="text-sm text-muted">Trading overview</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your trading hub</h1><p className="mt-2 text-sm text-muted">Monitor your robots and execution environment.</p></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-300"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" /> MOCK MODE</span>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="mt-7 rounded-3xl border border-white/[0.08] bg-panel p-5 shadow-glow sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">VPS instance · demo data</p><h2 className="mt-2 text-xl font-semibold">SMC Sniper Scalp</h2><p className="mt-1 text-xs text-muted">Version 1.06 · XAUUSD · M5</p></div>
          <div className="rounded-2xl bg-success/10 p-3 text-success"><Cpu size={24} /></div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-success/15 bg-success/[0.06] px-3 py-3">
          <Wifi size={16} className="text-success" /><span className="text-sm font-medium text-success">RUNNING — PORTABLE</span><span className="ml-auto text-[11px] text-muted">SIMULATED</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-elevated p-3"><p className="text-xs text-muted">Balance</p><p className="mt-1 text-lg font-semibold">$10,000.00</p></div>
          <div className="rounded-xl bg-elevated p-3"><p className="text-xs text-muted">Floating P/L</p><p className="mt-1 text-lg font-semibold text-success">+$482.60</p></div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["START", "STOP", "RESTART"].map((action) => <button key={action} disabled className={`rounded-xl px-2 py-3 text-xs font-semibold opacity-70 ${action === "START" ? "bg-accent text-white" : "border border-white/10 bg-elevated text-slate-200"}`}>{action}</button>)}
        </div>
        <p className="mt-3 text-[11px] text-muted">Controls are intentionally inactive until authentication and server-side job authorization are implemented.</p>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">SMC telemetry</h2><p className="mt-1 text-xs text-muted">Sample state-engine transitions</p></div><Activity size={19} className="text-blue-400" /></div>
        <div className="space-y-3">
          {events.map((event, index) => <div key={event.time} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-panel p-4">
            <div className="flex flex-col items-center"><span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-blue-300">{index + 1}</span>{index !== events.length - 1 && <span className="mt-2 h-full w-px bg-white/10" />}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{event.title}</p><span className={`text-[10px] font-semibold tracking-wider ${event.state === "CONFIRMED" ? "text-success" : "text-amber-400"}`}>{event.state}</span></div><p className="mt-1 text-xs text-muted">{event.detail}</p><p className="mt-2 font-mono text-[10px] text-slate-500">{event.time} UTC</p></div>
          </div>)}
        </div>
      </section>

      <button disabled className="fixed bottom-24 right-5 flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white opacity-80 shadow-lg shadow-blue-950/40 sm:bottom-8 sm:right-8"><Plus size={18} /> Add robot</button>

      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[#0B0E14]/95 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          <a href="#" aria-current="page" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-blue-400"><Bot size={19} />Home</a>
          <a href="#telemetry" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-muted"><Activity size={19} />Telemetry</a>
          <a href="#mentor" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-muted"><ShieldCheck size={19} />Mentor</a>
          <a href="#account" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-muted"><Cpu size={19} />Account</a>
        </div>
      </nav>
    </main>
  );
}
