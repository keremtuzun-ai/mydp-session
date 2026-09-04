"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedSchoolEmail, normalizeEmail } from "@/lib/auth/domains";
import { getAllowedSchoolDomains, siteUrl } from "@/lib/env";
import { emailSchema, otpSchema, passwordLoginSchema, passwordSchema } from "@/lib/validation/schemas";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

function domainList() {
  const d = getAllowedSchoolDomains();
  return d.length ? d.map((x) => `@${x}`).join(", ") : "the school's domains";
}

/** Step 1 of first-time setup: send a one-time code to a school address. */
export async function startFirstTimeSetup(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("Enter a valid email address.");
  const email = normalizeEmail(parsed.data);
  if (!isAllowedSchoolEmail(email)) {
    return fail(`Only school addresses can join. Use your ${domainList()} email.`);
  }

  // If this address already finished onboarding, guide them to sign in instead.
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("onboarding_completed_at").eq("school_email", email).maybeSingle();
  if (existing?.onboarding_completed_at) {
    return fail("An account already exists for this email. Use “Already have an account” to sign in.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding` },
  });
  if (error) return fail(error.message.includes("rate") ? "Too many requests. Wait a minute and try again." : error.message);
  redirect(`/verify?email=${encodeURIComponent(email)}&flow=setup`);
}

/** Send a sign-in code to an existing account. Never creates accounts. */
export async function requestLoginCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("Enter a valid email address.");
  const email = normalizeEmail(parsed.data);
  if (!isAllowedSchoolEmail(email)) return fail(`Only school addresses can sign in. Use your ${domainList()} email.`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard` },
  });
  if (error) {
    if (/signups not allowed|not found/i.test(error.message)) {
      return fail("No account exists for this email yet. Use “First time here?” to set one up.");
    }
    return fail(error.message);
  }
  redirect(`/verify?email=${encodeURIComponent(email)}&flow=login`);
}

/** Exchange the emailed 6-digit code for a session. */
export async function verifyEmailCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = otpSchema.safeParse({ email: formData.get("email"), token: formData.get("token") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the code and try again.");
  const email = normalizeEmail(parsed.data.email);
  if (!isAllowedSchoolEmail(email)) return fail("This email is not from an approved school domain.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: parsed.data.token, type: "email" });
  if (error || !data.user) return fail("That code is invalid or has expired. Request a new one.");

  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", data.user.id).maybeSingle();
  redirect(profile?.onboarding_completed_at ? "/dashboard" : "/onboarding");
}

/**
 * Username + password sign-in. The username is resolved to the verified
 * school email on the server with the service-role client; the email is never
 * sent to the browser. A username alone can never authenticate.
 */
export async function signInWithPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = passwordLoginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter your username and password.");
  const next = typeof formData.get("next") === "string" ? String(formData.get("next")) : "/dashboard";

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("school_email, onboarding_completed_at")
    .eq("username", parsed.data.username)
    .maybeSingle();

  const invalid = fail("Incorrect username or password.");
  if (!profile) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: profile.school_email, password: parsed.data.password });
  if (error) return invalid;
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

/** Password reset only through the verified school email. */
export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return fail("Enter a valid email address.");
  const email = normalizeEmail(parsed.data);
  if (!isAllowedSchoolEmail(email)) return fail(`Only school addresses can reset a password. Use your ${domainList()} email.`);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password/update` });
  // Same message whether or not the account exists, to avoid enumeration.
  return ok(undefined, "If an account exists for that email, a reset link and code are on the way.");
}

/** Used by the reset flow after the recovery link/code established a session. */
export async function updatePasswordFromRecovery(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const schema = z.object({ password: passwordSchema, confirm_password: z.string() }).refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
  const parsed = schema.safeParse({ password: formData.get("password"), confirm_password: formData.get("confirm_password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the password fields.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message);
  await logAudit({ actorId: user.id, action: "password.reset", entityType: "profile", entityId: user.id });
  redirect("/dashboard?reset=1");
}

/** Verify a recovery code typed by hand (when the email includes {{ .Token }}). */
export async function verifyRecoveryCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = otpSchema.safeParse({ email: formData.get("email"), token: formData.get("token") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the code and try again.");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(parsed.data.email), token: parsed.data.token, type: "recovery" });
  if (error) return fail("That code is invalid or has expired.");
  redirect("/reset-password/update");
}
