"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessCodeSchema } from "@/lib/auth/access-code";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

const WRONG_CODE = "That access code is not recognised. Check it with the Secretariat.";

/**
 * The only way in for members: the 12-character access code the executive
 * desk issued with their account. The code is looked up with the service
 * role, then the browser is signed in to that account by verifying a
 * server-generated one-time token, so no password exists anywhere. Required
 * on every visit (the session ends when the browser closes).
 */
export async function signInWithAccessCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = accessCodeSchema.safeParse(formData.get("code") ?? "");
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter your access code.", { code: [parsed.error.issues[0]?.message ?? "Enter your access code."] });
  const code = parsed.data;
  const next = safeNext(formData.get("next"));

  const admin = createAdminClient();
  const { data: issued } = await admin.from("access_codes").select("profile_id").eq("code", code).maybeSingle();
  if (!issued) return fail(WRONG_CODE, { code: [WRONG_CODE] });
  const { data: profile } = await admin.from("profiles").select("school_email, onboarding_completed_at, display_name").eq("id", issued.profile_id).maybeSingle();
  if (!profile) return fail(WRONG_CODE, { code: [WRONG_CODE] });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: profile.school_email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("[auth] generateLink failed for code sign-in", linkError?.status ?? "", linkError?.message ?? "no token");
    return fail("Could not sign you in right now. Try again in a moment.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error || !data.user) {
    console.error("[auth] verifyOtp failed for code sign-in", error?.status ?? "", error?.code ?? "", error?.message ?? "no user");
    return fail("Could not sign you in right now. Try again in a moment.");
  }

  await logAudit({ actorId: data.user.id, action: "member.code_signin", entityType: "profile", entityId: data.user.id });
  redirect(profile.onboarding_completed_at ? next : "/onboarding");
}
