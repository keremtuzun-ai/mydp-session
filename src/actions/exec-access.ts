"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { execAccountEmail, getExecInviteToken, getExecSharedPassword } from "@/lib/env";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Constant-time check of the secret path segment against EXEC_INVITE_TOKEN. */
export async function isValidExecInviteToken(candidate: string | undefined): Promise<boolean> {
  const expected = getExecInviteToken();
  return Boolean(expected && candidate && same(candidate, expected));
}

/**
 * Points the shared account's Supabase password at EXEC_SHARED_PASSWORD.
 * The password lives in two places (the environment and Supabase Auth), and
 * rotating one without running `npm run exec:account` used to lock the desk
 * out silently. Only reached once the typed password has already matched the
 * environment, so this re-syncs rather than granting anything new.
 */
async function syncSharedExecPassword(email: string, password: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("school_email", email).maybeSingle();
    if (profile?.id) {
      const { error } = await admin.auth.admin.updateUserById(profile.id, { password, email_confirm: true });
      return !error;
    }
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return false;
    const { error: profileError } = await admin
      .from("profiles")
      .update({ display_name: null, username: "executive", grade: "12", role: "executive", onboarding_completed_at: new Date().toISOString() })
      .eq("id", data.user.id);
    return !profileError;
  } catch {
    return false;
  }
}

/**
 * Secret executive link: the whole Secretariat shares one account. Whoever
 * opens /exec-invite/<token> and enters the executive password is signed in
 * to that account and sent to the desk. Executives type their own name on
 * every task or announcement they publish.
 */
export async function signInExecutive(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || !(await isValidExecInviteToken(token))) return fail("This link is not valid any more.");
  const password = formData.get("password");
  const expected = getExecSharedPassword();
  if (!expected) return fail("The executive password is not configured. Ask the admin.");
  if (typeof password !== "string" || !same(password, expected)) return fail("Incorrect executive password.");

  const email = execAccountEmail();
  if (!email) return fail("The shared executive address is not configured. Ask the admin.");
  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({ email, password: expected });
  if (error || !data.user) {
    // The environment is the source of truth: re-point the account at it, then retry once.
    if (!(await syncSharedExecPassword(email, expected)))
      return fail("The shared executive account could not be opened. Ask the admin to run the account script.");
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password: expected }));
    if (error || !data.user) return fail("The shared executive account could not be opened. Ask the admin to run the account script.");
  }
  await logAudit({ actorId: data.user.id, action: "exec.shared_signin", entityType: "profile", entityId: data.user.id });
  redirect("/exec");
}
