/**
 * Creates or updates the single shared executive account used by the secret
 * link (/exec-invite/<EXEC_INVITE_TOKEN>). Run after setting or rotating
 * EXEC_SHARED_PASSWORD:  npm run exec:account
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.EXEC_SHARED_PASSWORD;
const domain = (process.env.ALLOWED_SCHOOL_DOMAINS ?? "").split(",")[0]?.trim().toLowerCase().replace(/^@/, "");
const email = (process.env.EXEC_ACCOUNT_EMAIL ?? (domain ? `secretariat@${domain}` : "")).toLowerCase();
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!password) throw new Error("EXEC_SHARED_PASSWORD is empty");
if (!email) throw new Error("No shared account email: set ALLOWED_SCHOOL_DOMAINS or EXEC_ACCOUNT_EMAIL");

async function main() {
  const admin = createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existing } = await admin.from("profiles").select("id").eq("school_email", email).maybeSingle();
  let id = existing?.id;
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await admin
    .from("profiles")
    .update({ display_name: null, username: "executive", grade: "12", role: "executive", onboarding_completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  console.log(`Shared executive account ready: ${email} (${existing ? "password updated" : "created"})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
