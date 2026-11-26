"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadEaBuildAction(formData: FormData) {
  const session = createSupabaseServerClient();
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await session.from("profiles").select("role,mentor_approved").eq("id", user.id).maybeSingle();
  if (profile?.role !== "MENTOR_ADMIN" || !profile.mentor_approved) redirect("/dashboard/mentor?error=Approved%20mentor%20access%20required");

  const file = formData.get("eaFile");
  const version = String(formData.get("versionTag") ?? "").trim().slice(0, 40);
  const notes = String(formData.get("versionNotes") ?? "").trim().slice(0, 500);
  if (!(file instanceof File) || file.size === 0) redirect("/dashboard/mentor?error=Choose%20an%20EA%20file");
  if (file.size > 10 * 1024 * 1024) redirect("/dashboard/mentor?error=EA%20file%20must%20be%2010MB%20or%20smaller");
  if (!/\.(mq5|ex5)$/i.test(file.name)) redirect("/dashboard/mentor?error=Only%20.mq5%20and%20.ex5%20files%20are%20allowed");
  if (!version || !/^[A-Za-z0-9._+-]{1,40}$/.test(version)) redirect("/dashboard/mentor?error=Enter%20a%20valid%20version%20tag");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) redirect("/dashboard/mentor?error=Server%20storage%20is%20not%20configured");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${user.id}/${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from("ea-files").upload(path, bytes, {
    contentType: "application/octet-stream", upsert: false
  });
  if (uploadError) redirect("/dashboard/mentor?error=EA%20upload%20failed");
  const { error: rowError } = await admin.from("ea_builds").insert({
    mentor_id: user.id, file_path: path, file_name: safeName,
    version_tag: version, version_notes: notes || null, is_active: false
  });
  if (rowError) {
    await admin.storage.from("ea-files").remove([path]);
    redirect("/dashboard/mentor?error=Build%20record%20could%20not%20be%20saved");
  }
  redirect("/dashboard/mentor?uploaded=1");
}
