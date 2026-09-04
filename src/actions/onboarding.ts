"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedSchoolEmail } from "@/lib/auth/domains";
import { onboardingSchema } from "@/lib/validation/schemas";
import { AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/validation/files";
import { fail, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    (out[key] ??= []).push(i.message);
  }
  return out;
}

/**
 * Completes the profile after email verification. Everything the client
 * claims is re-validated here, and the profile trigger re-checks the rest.
 */
export async function completeOnboarding(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  // Server-side proof of school-email verification.
  if (!user.email || !user.email_confirmed_at) return fail("Verify your school email before continuing.");
  if (!isAllowedSchoolEmail(user.email)) return fail("Your email is not from an approved school domain.");

  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  const parsed = onboardingSchema.safeParse({
    display_name: formData.get("display_name"),
    grade: formData.get("grade"),
    phone: formData.get("phone") ?? "",
    username: formData.get("username"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const input = parsed.data;

  const { data: available } = await supabase.rpc("username_available", { p_username: input.username });
  if (available === false) return fail("Check the highlighted fields.", { username: ["That username is already taken"] });

  // Optional avatar
  let avatar_url: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!AVATAR_TYPES.includes(avatar.type)) return fail("Check the highlighted fields.", { avatar: ["Use a PNG, JPG or WebP image"] });
    if (avatar.size > MAX_AVATAR_BYTES) return fail("Check the highlighted fields.", { avatar: ["Profile photos must be under 2 MB"] });
    const ext = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (upErr) return fail(`Could not upload the photo: ${upErr.message}`);
    avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error: pwErr } = await supabase.auth.updateUser({ password: input.password });
  if (pwErr) return fail(`Could not set the password: ${pwErr.message}`);

  const { error } = await supabase
    .from("profiles")
    .update({
      username: input.username,
      display_name: input.display_name,
      grade: input.grade,
      phone: input.phone || null,
      avatar_url,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return fail("Check the highlighted fields.", { username: ["That username was just taken. Choose another."] });
    return fail(describeDbError(error));
  }

  await logAudit({ actorId: user.id, action: "profile.onboarded", entityType: "profile", entityId: user.id, metadata: { username: input.username } });
  redirect("/dashboard?welcome=1");
}
