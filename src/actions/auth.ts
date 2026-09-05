"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedSchoolEmail, normalizeEmail } from "@/lib/auth/domains";
import { getAllowedSchoolDomains } from "@/lib/env";
import { signUpSchema, emailPasswordLoginSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

function domainList() {
  const d = getAllowedSchoolDomains();
  return d.length ? d.map((x) => `@${x}`).join(", ") : "the school's domains";
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/**
 * Create an account with a school email and a password. No verification
 * email: the account is created server-side (already confirmed) as long as
 * the domain is on the school allow-list, then the member is signed in and
 * sent to onboarding.
 */
export async function signUpWithPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), confirm_password: formData.get("confirm_password") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const email = normalizeEmail(parsed.data.email);
  if (!isAllowedSchoolEmail(email)) return fail("Check the highlighted fields.", { email: [`Only school addresses can join. Use your ${domainList()} email.`] });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id, onboarding_completed_at").eq("school_email", email).maybeSingle();
  if (existing) {
    return fail("An account already exists for this email. Sign in instead.", { email: ["Already registered"] });
  }

  const { data: created, error } = await admin.auth.admin.createUser({ email, password: parsed.data.password, email_confirm: true });
  if (error || !created.user) {
    const msg = error?.message ?? "Could not create the account.";
    return fail(/already|exists/i.test(msg) ? "An account already exists for this email. Sign in instead." : msg);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (signInError) return fail("Account created, but sign-in failed. Go to the sign-in page and use your email and password.");
  await logAudit({ actorId: created.user.id, action: "account.created", entityType: "profile", entityId: created.user.id });
  redirect("/onboarding");
}

/** Emails on the executive allow-list (secret invite link) become executives on sign-in. */
async function promoteIfAllowlisted(userId: string, email: string, from: string) {
  const admin = createAdminClient();
  const { data: allowed } = await admin.from("exec_allowlist").select("email").eq("email", email).maybeSingle();
  if (!allowed) return;
  const { error } = await admin.from("profiles").update({ role: "executive" }).eq("id", userId);
  if (!error) await logAudit({ actorId: userId, action: "role.changed", entityType: "profile", entityId: userId, metadata: { from, to: "executive", via: "exec-allowlist" } });
}

/** Everyday sign-in: school email + password, required on every visit. */
export async function signInWithEmailPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailPasswordLoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter your email and password.");
  const email = normalizeEmail(parsed.data.email);
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) return fail("Incorrect email or password.");
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at, role").eq("id", data.user.id).maybeSingle();
  if (profile && (profile.role === "delegate" || profile.role === "chair")) await promoteIfAllowlisted(data.user.id, email, profile.role);
  redirect(profile?.onboarding_completed_at ? next : "/onboarding");
}
