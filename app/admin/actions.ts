"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function reviewMentorApplicationAction(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: actor, error: actorError } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (actorError || actor?.role !== "SUPERADMIN") redirect("/admin?error=Superadmin%20access%20required");

  const applicationId = String(formData.get("applicationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !["APPROVED", "REJECTED"].includes(decision)) {
    redirect("/admin?error=Invalid%20review%20request");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/admin?error=Server%20administration%20is%20not%20configured");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: application, error: appError } = await admin.from("mentor_applications")
    .select("id,user_id,status").eq("id", applicationId).maybeSingle();
  if (appError || !application) redirect("/admin?error=Mentor%20application%20not%20found");
  if (application.status !== "PENDING") redirect("/admin?message=This%20application%20has%20already%20been%20reviewed");

  // Claim the pending application first. The conditional update prevents two
  // administrators from approving and rejecting the same request concurrently.
  const { data: claimed, error: claimError } = await admin.from("mentor_applications").update({
    status: decision,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    review_note: reviewNote || null
  }).eq("id", applicationId).eq("status", "PENDING").select("id").maybeSingle();
  if (claimError || !claimed) redirect("/admin?message=This%20application%20was%20already%20reviewed");

  const approved = decision === "APPROVED";
  const { error: profileError } = await admin.from("profiles").update({
    role: approved ? "MENTOR_ADMIN" : "CLIENT",
    mentor_approved: approved
  }).eq("id", application.user_id);
  if (profileError) {
    await admin.from("mentor_applications").update({
      status: "PENDING", reviewed_at: null, reviewed_by: null, review_note: null
    }).eq("id", applicationId).eq("status", decision);
    redirect("/admin?error=Could%20not%20update%20mentor%20permissions.%20Application%20returned%20to%20pending");
  }
  redirect("/admin?reviewed=1");
}
