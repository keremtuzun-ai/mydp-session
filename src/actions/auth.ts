"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/domains";
import { signUpSchema, emailPasswordLoginSchema, signInNameSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

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
 * Create an account with an email and a password. No verification email:
 * the account is created server-side (already confirmed), then the member is
 * signed in and sent to onboarding.
 */
export async function signUpWithPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), confirm_password: formData.get("confirm_password") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const email = normalizeEmail(parsed.data.email);

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

/**
 * Everyday sign-in: name, surname, email + password, required on every visit.
 * The name and surname are stored on the account's profile (and shown to the
 * executive desk next to every submission).
 */
export async function signInWithEmailPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailPasswordLoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter your email and password.");
  const name = signInNameSchema.safeParse({ first_name: formData.get("first_name") ?? "", last_name: formData.get("last_name") ?? "" });
  if (!name.success) return fail(name.error.issues[0]?.message ?? "Enter your name and surname.", fieldErrors(name.error.issues));
  const email = normalizeEmail(parsed.data.email);
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) return fail("Incorrect email or password.");
  const { first_name, last_name } = name.data;
  const displayName = `${first_name} ${last_name}`;
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at, display_name, first_name, last_name").eq("id", data.user.id).maybeSingle();
  if (profile && (profile.first_name !== first_name || profile.last_name !== last_name || profile.display_name !== displayName)) {
    await supabase.from("profiles").update({ first_name, last_name, display_name: displayName }).eq("id", data.user.id);
  }
  redirect(profile?.onboarding_completed_at ? next : "/onboarding");
}
