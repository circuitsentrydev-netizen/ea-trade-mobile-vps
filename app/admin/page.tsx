import { redirect } from "next/navigation";
import { ShieldCheck, Users, Clock3 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewMentorApplicationAction } from "./actions";

type Props = { searchParams?: { error?: string; message?: string; reviewed?: string } };

export default async function AdminPage({ searchParams }: Props) {
  const session = createSupabaseServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: actor } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actor?.role !== "SUPERADMIN") redirect("/dashboard");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return <SectionPage eyebrow="PLATFORM CONTROL" title="Superadmin" description="Server administration configuration is required."><p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">SUPABASE_SERVICE_ROLE_KEY is not configured on the server. No administrative actions are available.</p></SectionPage>;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: applications, error }, { count: mentorCount }, { count: clientCount }, { count: accountCount }, { count: pendingJobs }] = await Promise.all([
    admin.from("mentor_applications").select("id,user_id,status,submitted_at").eq("status", "PENDING").order("submitted_at", { ascending: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "MENTOR_ADMIN").eq("mentor_approved", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "CLIENT"),
    admin.from("mt5_accounts").select("id", { count: "exact", head: true }),
    admin.from("vps_jobs").select("id", { count: "exact", head: true }).eq("status", "PENDING")
  ]);
  const ids = (applications ?? []).map(a => a.user_id);
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id,display_name,created_at").in("id", ids) : { data: [] };
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  return <SectionPage eyebrow="PLATFORM CONTROL" title="Superadmin console" description="Review mentor applications and monitor the platform's current workload.">
    {searchParams?.error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{searchParams.error}</p>}
    {searchParams?.message && <p role="status" className="mb-4 rounded-xl border border-blue-400/20 bg-blue-400/[0.06] p-3 text-sm text-blue-200">{searchParams.message}</p>}
    {searchParams?.reviewed && <p role="status" className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-200">Mentor application review saved.</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["APPROVED MENTORS",mentorCount ?? 0],["CLIENTS",clientCount ?? 0],["MT5 ACCOUNTS",accountCount ?? 0],["PENDING JOBS",pendingJobs ?? 0]].map(([label,value])=><div key={String(label)} className="surface-card p-4"><p className="text-[10px] font-semibold tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
    </div>
    <div className="mt-6 flex items-center gap-2"><Users size={18} className="text-blue-300"/><h2 className="text-base font-semibold text-white">Mentor applications</h2><span className="ml-auto rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">{applications?.length ?? 0} pending</span></div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">Could not load applications. Check the database schema.</p>}
    {!applications?.length ? <div className="mt-3 rounded-xl border border-dashed border-white/15 p-8 text-center"><Clock3 size={22} className="mx-auto text-slate-500"/><p className="mt-3 text-sm font-medium text-white">No pending applications</p><p className="mt-1 text-xs text-slate-500">New mentor requests will appear here.</p></div> : <div className="mt-3 grid gap-3">{applications.map(app=>{const profile=profileMap.get(app.user_id);return <article key={app.id} className="surface-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-white">{profile?.display_name || "Unnamed applicant"}</h3><p className="mt-1 text-xs text-slate-500">User ID: {app.user_id}</p><p className="mt-1 text-xs text-slate-500">Applied {new Date(app.submitted_at).toLocaleString()}</p></div><span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300">PENDING</span></div><form action={reviewMentorApplicationAction} className="mt-4 grid gap-3"><input type="hidden" name="applicationId" value={app.id}/><label className="grid gap-1.5 text-xs text-slate-400">Review note (optional)<textarea name="reviewNote" maxLength={500} rows={2} className="field-input" placeholder="Reason or guidance for the applicant"/></label><div className="flex flex-wrap gap-2"><button name="decision" value="APPROVED" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"><ShieldCheck size={14}/> Approve mentor</button><button name="decision" value="REJECTED" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-500/10 px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/20">Reject application</button></div></form></article>})}</div>}
    <p className="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-xs leading-5 text-amber-100/80">Approval grants the MENTOR_ADMIN role and unlocks mentor signal publishing. It does not yet enable EA file hosting, client licence administration or a live MT5 worker.</p>
  </SectionPage>;
}
