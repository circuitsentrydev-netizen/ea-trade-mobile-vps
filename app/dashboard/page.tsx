import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Bot, KeyRound, ShieldCheck, Settings2, LogOut } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth-actions";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, mentor_approved")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.display_name || user.email?.split("@")[0] || "Trader";
  const cards = [
    { href: "/dashboard/instances", label: "Robot instances", detail: "Connect and monitor your MT5 hosting slots", icon: Bot },
    { href: "/dashboard/telemetry", label: "Telemetry journal", detail: "Review SMC state and execution events", icon: Activity },
    { href: "/dashboard/mentor", label: "Mentor workspace", detail: "Builds, client keys and mentor approval", icon: KeyRound },
    { href: "/dashboard/account", label: "Account & security", detail: "Your profile and account preferences", icon: Settings2 }
  ];

  return <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-5 py-10 sm:px-8">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="eyebrow">SECURE WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Welcome, {name}</h1><p className="mt-2 text-sm text-slate-400">You are signed in to EA Trade Mobile VPS.</p></div>
      <form action={signOutAction}><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5"><LogOut size={15}/> Sign out</button></form>
    </div>
    <section className="surface-card mt-8 p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck size={20}/></span><div><h2 className="text-sm font-semibold text-white">Authentication connected</h2><p className="mt-1 text-xs text-slate-400">Your Supabase session is verified on the server.</p></div></div>
      <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-3">
        <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ACCOUNT EMAIL</p><p className="mt-1.5 break-all text-sm text-slate-200">{user.email}</p></div>
        <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">ACCESS ROLE</p><p className="mt-1.5 text-sm text-slate-200">{profile?.role || "CLIENT"}</p></div>
        <div><p className="text-[10px] font-semibold tracking-wider text-slate-500">MENTOR STATUS</p><p className="mt-1.5 text-sm text-slate-200">{profile?.mentor_approved ? "Approved" : "Not approved / not applicable"}</p></div>
      </div>
    </section>
    <div className="mt-8"><p className="eyebrow">YOUR WORKSPACE</p><h2 className="mt-2 text-lg font-semibold text-white">Platform modules</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
      {cards.map(({href,label,detail,icon:Icon})=><Link key={href} href={href} className="surface-card flex items-center gap-4 p-5 transition hover:border-blue-400/30 hover:bg-white/[0.025]"><span className="grid h-11 w-11 place-items-center rounded-xl border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><Icon size={20}/></span><span className="min-w-0"><strong className="block text-sm text-slate-100">{label}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span></span></Link>)}
    </div></div>
    <p className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-xs leading-5 text-amber-100/80">Execution is currently simulation-only. No MT5 terminal worker is connected and this dashboard cannot place live trades.</p>
  </main>;
}
