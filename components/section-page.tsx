import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function SectionPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-5 py-10 sm:px-8">
    <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white"><ArrowLeft size={14}/> Back to overview</Link>
    <div className="mt-8"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p></div>
    <section className="surface-card mt-7 p-5 sm:p-6">{children}</section>
    <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14}/> Secure workspace · feature activation follows authentication and server-side authorization.</p>
  </main>;
}
