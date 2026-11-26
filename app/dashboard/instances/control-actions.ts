"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestInstanceAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(accountId) || !["START_INSTANCE", "STOP_INSTANCE"].includes(intent)) {
    redirect("/dashboard/instances?error=Invalid%20instance%20request");
  }

  const session = createSupabaseServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) redirect("/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/dashboard/instances?error=Secure%20job%20queue%20is%20not%20configured");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: account, error: accountError } = await admin.from("mt5_accounts")
    .select("id, owner_id, status, account_mode, symbol")
    .eq("id", accountId).eq("owner_id", user.id).maybeSingle();
  if (accountError || !account) redirect("/dashboard/instances?error=Account%20not%20found");

  if (intent === "START_INSTANCE" && account.status === "RUNNING") {
    redirect("/dashboard/instances?message=This%20instance%20is%20already%20running");
  }
  if (intent === "STOP_INSTANCE" && account.status === "STOPPED") {
    redirect("/dashboard/instances?message=This%20instance%20is%20already%20stopped");
  }

  const jobType = intent as "START_INSTANCE" | "STOP_INSTANCE";
  const { data: job, error: jobError } = await admin.from("vps_jobs").insert({
    owner_id: user.id,
    account_id: account.id,
    job_type: jobType,
    payload: { requested_by: user.id, account_mode: account.account_mode, symbol: account.symbol, source: "user_dashboard" },
    status: "PENDING"
  }).select("id").single();

  if (jobError || !job) redirect("/dashboard/instances?error=Could%20not%20queue%20the%20request");
  const { error: updateError } = await admin.from("mt5_accounts")
    .update({ status: "QUEUED", updated_at: new Date().toISOString() })
    .eq("id", account.id).eq("owner_id", user.id);
  if (updateError) redirect("/dashboard/instances?error=Request%20was%20queued%20but%20instance%20status%20did%20not%20refresh");

  redirect(`/dashboard/instances?queued=${encodeURIComponent(job.id)}`);
}
