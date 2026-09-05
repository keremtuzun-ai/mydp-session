"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedSchoolEmail, normalizeEmail } from "@/lib/auth/domains";
import { getAllowedSchoolDomains, getExecInviteToken } from "@/lib/env";
import { emailSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

/** Constant-time check of the secret path segment against EXEC_INVITE_TOKEN. */
export async function isValidExecInviteToken(candidate: string | undefined): Promise<boolean> {
  const expected = getExecInviteToken();
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Secret executive invite: whoever opens /exec-invite/<token> and enters a
 * school email is added to the executive allow-list. A registered account is
 * promoted at once; a new account is created as an executive by the
 * handle_new_auth_user trigger. Then they are sent to sign in or sign up.
 */
export async function joinExecutives(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || !(await isValidExecInviteToken(token))) return fail("This invite link is not valid any more.");

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("Check the highlighted fields.", { email: [parsed.error.issues[0]?.message ?? "Enter a valid email"] });
  const email = normalizeEmail(parsed.data);
  if (!isAllowedSchoolEmail(email)) {
    const d = getAllowedSchoolDomains();
    return fail("Check the highlighted fields.", { email: [`Only school addresses can be executives. Use your ${d.length ? d.map((x) => `@${x}`).join(", ") : "school"} email.`] });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("exec_allowlist").upsert({ email, note: "Joined via the executive invite link" }, { onConflict: "email" });
  if (error) return fail("Could not save your email. Try again.");

  const { data: profile } = await admin.from("profiles").select("id, role, onboarding_completed_at").eq("school_email", email).maybeSingle();
  if (profile && (profile.role === "delegate" || profile.role === "chair")) {
    await admin.from("profiles").update({ role: "executive" }).eq("id", profile.id);
    await logAudit({ actorId: profile.id, action: "role.changed", entityType: "profile", entityId: profile.id, metadata: { from: profile.role, to: "executive", via: "exec-invite" } });
  }

  // Already signed in with this address: straight to the desk.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && normalizeEmail(user.email ?? "") === email) redirect(profile?.onboarding_completed_at ? "/exec" : "/onboarding");

  const q = `email=${encodeURIComponent(email)}&exec=1`;
  redirect(profile ? `/login?next=%2Fexec&${q}` : `/welcome?${q}`);
}
