import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { SectionPage } from "@/components/section-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MentorPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role, mentor_approved").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    return <SectionPage eyebrow="MENTOR WORKSPACE" title="Mentor access" description="Your account permissions could not be verified.">
      <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">We could not load your account permissions. Please refresh or contact support.</p>
    </SectionPage>;
  }

  const { data: application } = await supabase
    .from("mentor_applications").select("status, submitted_at, reviewed_at, review_note")
    .eq("user_id", user.id).maybeSingle();

  const isApproved = profile.role === "MENTOR_ADMIN" && profile.mentor_approved;
  const isSuperadmin = profile.role === "SUPERADMIN";
  const status = isApproved ? "APPROVED" : application?.status ?? "NOT_SUBMITTED";
  const statusStyle = status === "APPROVED"
    ? "border-emerald-400/20 bg-emerald-400/[0.06]"
    : status === "REJECTED" ? "border-rose-400/20 bg-rose-400/[0.06]"
    : "border-amber-400/20 bg-amber-400/[0.06]";

  return <SectionPage eyebrow="MENTOR WORKSPACE" title="Mentor administration" description="Mentor permissions are granted only after a Superadmin review. Your application status is read directly from your account record.">
    <div className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-400/15 bg-blue-400/[0.08] text-blue-300"><UserRound size={19}/></span>
        <div className="min-w-0"><h2 className="text-sm font-semibold text-white">Mentor access status</h2><p className="mt-1 text-xs leading-5 text-slate-400">Role: {profile.role}</p></div>
      </div>
      <div className={`mt-5 rounded-xl border ${statusStyle} p-4`}>
        <div className="flex items-center gap-2">
          {status === "APPROVED" ? <ShieldCheck size={17} className="text-emerald-300"/> : status === "REJECTED" ? <XCircle size={17} className="text-rose-300"/> : <Clock3 size={17} className="text-amber-300"/>}
          <p className="text-sm font-semibold text-white">{status === "APPROVED" ? "Mentor approved" : status === "REJECTED" ? "Application not approved" : status === "PENDING" ? "Application pending review" : "No mentor application found"}</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">{status === "APPROVED" ? "Your mentor role is active. Mentor build uploads, license issuance and client administration still require their respective workflows to be completed." : status === "REJECTED" ? "Your application was not approved. Contact the platform administrator if you need clarification." : status === "PENDING" ? "Your request has been recorded. Mentor tools remain locked until an administrator approves it." : "Your account is currently a client account. Select Mentor during registration to submit an application; existing accounts need administrator assistance."}</p>
        {application?.submitted_at && <p className="mt-3 text-[11px] text-slate-400">Submitted {new Date(application.submitted_at).toLocaleString()}</p>}
        {application?.reviewed_at && <p className="mt-1 text-[11px] text-slate-400">Reviewed {new Date(application.reviewed_at).toLocaleString()}</p>}
        {application?.review_note && <p className="mt-3 rounded-lg bg-black/20 p-3 text-xs leading-5 text-slate-200">Administrator note: {application.review_note}</p>}
      </div>
    </div>
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-5 text-slate-400">{isSuperadmin ? "You have Superadmin access. The dedicated mentor and client administration console is not yet implemented." : "This page currently reports your approval status only. EA file upload, license key generation/revocation, mentor client views and personal hosting slot management are not yet active. These will remain clearly marked until their secure server-side workflows are implemented."}</div>
  </SectionPage>;
}
