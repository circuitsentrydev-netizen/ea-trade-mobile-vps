import Link from "next/link";
import { createMt5AccountAction } from "@/app/dashboard/instances/actions";
import { SectionPage } from "@/components/section-page";

type Props = { searchParams?: { error?: string } };

export default function NewInstancePage({ searchParams }: Props) {
  return <SectionPage eyebrow="NEW INSTANCE" title="Connect a robot" description="Register an MT5 trading account. Credentials are encrypted before they are stored.">
    {searchParams?.error && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-3 text-sm text-rose-200">{searchParams.error}</p>}
    <form action={createMt5AccountAction} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-300">Account label<input name="label" maxLength={80} placeholder="My Deriv demo" className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300">Account mode<select name="accountMode" required className="field-input"><option value="DEMO">DEMO</option><option value="LIVE">LIVE</option></select></label>
        <label className="grid gap-2 text-sm text-slate-300">MT5 Login ID<input name="loginId" inputMode="numeric" pattern="[0-9]{3,20}" required autoComplete="off" placeholder="12345678" className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300">Broker server<input name="brokerServer" required autoComplete="off" placeholder="Deriv-Server" className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">MT5 password<input name="password" type="password" required autoComplete="new-password" className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300">Trading symbol<input name="symbol" required placeholder="XAUUSD" className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300">Timeframe<select name="timeframe" className="field-input" defaultValue="M5">{["M1","M5","M15","M30","H1","H4","D1"].map(v=><option key={v}>{v}</option>)}</select></label>
        <label className="grid gap-2 text-sm text-slate-300">Lot size<input name="lotSize" type="number" min="0.01" max="100" step="0.01" defaultValue="0.01" required className="field-input" /></label>
        <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">Mentor HOST ROBOT KEY <span className="text-xs text-slate-500">Required for client accounts. Superadmin and eligible approved mentor personal slots are exempt.</span><input name="hostRobotKey" autoComplete="off" placeholder="SMC-XXXX-XXXX" className="field-input" /></label>
      </div>
      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-xs leading-5 text-emerald-100/80">Credential protection: AES-256-GCM encryption is performed server-side. Your MT5 password is never sent back to the browser or shown to mentors. Saving an account does not start a terminal or place trades.</div>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">Save MT5 account</button><Link href="/dashboard/instances" className="rounded-lg border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5">Cancel</Link></div>
    </form>
  </SectionPage>;
}
