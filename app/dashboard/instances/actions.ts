"use server";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptMt5Password, type EncryptedSecret } from "@/lib/security/encryption";

function fail(message: string): never {
  redirect(`/dashboard/instances/new?error=${encodeURIComponent(message)}`);
}

export async function createMt5AccountAction(formData: FormData) {
  const sessionClient = createSupabaseServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) redirect("/login");

  const loginId = String(formData.get("loginId") ?? "").trim();
  const brokerServer = String(formData.get("brokerServer") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accountMode = String(formData.get("accountMode") ?? "DEMO");
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const timeframe = String(formData.get("timeframe") ?? "M5");
  const lotSizeRaw = String(formData.get("lotSize") ?? "0.01");
  const hostRobotKey = String(formData.get("hostRobotKey") ?? "").trim();
  const label = String(formData.get("label") ?? "My MT5 account").trim();

  if (!loginId || !brokerServer || !password || !symbol) fail("Complete all required MT5 connection fields.");
  if (!/^\d{3,20}$/.test(loginId)) fail("MT5 Login ID must contain 3–20 digits.");
  if (!["DEMO", "LIVE"].includes(accountMode)) fail("Choose DEMO or LIVE account mode.");
  if (!/^[A-Z0-9._-]{2,24}$/.test(symbol)) fail("Enter a valid trading symbol.");
  if (!["M1","M5","M15","M30","H1","H4","D1"].includes(timeframe)) fail("Choose a supported timeframe.");
  const lotSize = Number(lotSizeRaw);
  if (!Number.isFinite(lotSize) || lotSize <= 0 || lotSize > 100) fail("Lot size must be between 0.01 and 100.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) fail("Secure server setup is incomplete. The Supabase service-role key must be configured on the server.");
  if (!process.env.MT5_ENCRYPTION_KEY) fail("MT5 encryption is not configured. Ask the administrator to configure the encryption key.");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await sessionClient
    .from("profiles").select("role, mentor_approved").eq("id", user.id).maybeSingle();
  if (profileError || !profile) fail("Your account profile could not be verified.");

  let mentorId: string | null = null;
  let licenseId: string | null = null;
  let isPersonalMentorSlot = false;

  if (profile.role === "MENTOR_ADMIN" && profile.mentor_approved) {
    const { count, error: countError } = await admin.from("mt5_accounts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id).eq("is_personal_mentor_slot", true);
    if (countError) fail("Could not verify your mentor hosting slot.");
    if ((count ?? 0) < 1 && accountMode === "DEMO") isPersonalMentorSlot = true;
  }

  if (profile.role !== "SUPERADMIN" && !isPersonalMentorSlot) {
    if (!hostRobotKey) fail("A valid mentor HOST ROBOT KEY is required for this account.");
    const keyHash = createHash("sha256").update(hostRobotKey).digest("hex");
    const { data: license, error: licenseError } = await admin.from("license_keys")
      .select("id, mentor_id, client_id, max_accounts, expires_at, status")
      .eq("key_hash", keyHash).maybeSingle();
    if (licenseError || !license || license.status !== "ACTIVE") fail("That HOST ROBOT KEY is invalid or inactive.");
    if (license.client_id && license.client_id !== user.id) fail("That HOST ROBOT KEY is already assigned to another client.");
    if (license.expires_at && new Date(license.expires_at).getTime() <= Date.now()) fail("That HOST ROBOT KEY has expired.");
    const { count, error: usageError } = await admin.from("mt5_accounts")
      .select("id", { count: "exact", head: true }).eq("license_id", license.id);
    if (usageError || (count ?? 0) >= license.max_accounts) fail("That HOST ROBOT KEY has reached its account limit.");
    mentorId = license.mentor_id;
    licenseId = license.id;
    if (!license.client_id) {
      const { error: assignError } = await admin.from("license_keys").update({ client_id: user.id }).eq("id", license.id).is("client_id", null);
      if (assignError) fail("Could not assign this licence. Please try again.");
    }
  }

  let encrypted: EncryptedSecret;
  try { encrypted = encryptMt5Password(password); }
  catch { fail("The MT5 encryption key is invalid or unavailable."); }

  const { data: account, error: insertError } = await admin.from("mt5_accounts").insert({
    owner_id: user.id,
    mentor_id: mentorId,
    license_id: licenseId,
    label: label.slice(0, 80) || "My MT5 account",
    login_id: loginId,
    broker_server: brokerServer,
    account_mode: accountMode,
    symbol,
    timeframe,
    lot_size: lotSize,
    password_ciphertext: encrypted.ciphertext,
    password_iv: encrypted.iv,
    password_auth_tag: encrypted.authTag,
    is_personal_mentor_slot: isPersonalMentorSlot
  }).select("id").single();

  if (insertError || !account) fail("The MT5 account could not be saved. Check the details and try again.");

  // Password fields are deliberately never returned to the browser.
  redirect(`/dashboard/instances?created=${encodeURIComponent(account.id)}`);
}
