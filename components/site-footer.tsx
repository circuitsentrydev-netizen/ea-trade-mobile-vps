import Link from "next/link";
import { Command, CircleHelp, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return <footer className="border-t border-white/[0.07] bg-[#0b111a]">
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><Command size={16}/></span>
        <div><p className="text-xs font-semibold tracking-wide text-slate-200">EA TRADE <span className="text-slate-500">MOBILE VPS</span></p><p className="mt-1 text-[10px] text-slate-500">Control your trading infrastructure.</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
        <Link href="/help" className="inline-flex items-center gap-1.5 hover:text-slate-300"><CircleHelp size={13}/> Help centre</Link>
        <Link href="/security" className="inline-flex items-center gap-1.5 hover:text-slate-300"><ShieldCheck size={13}/> Security</Link>
        <span>© {new Date().getFullYear()} EA Trade Mobile VPS</span>
      </div>
    </div>
  </footer>;
}
