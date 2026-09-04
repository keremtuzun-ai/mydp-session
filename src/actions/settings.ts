"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { profileUpdateSchema, changePasswordSchema } from "@/lib/validation/schemas";
import { AVATAR_TYPES, MAX_AVATAR_BYTES } from "@/lib/validation/files";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  const parsed = profileUpdateSchema.safeParse({
    display_name: formData.get("display_name"),
    grade: formData.get("grade"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.display_name, grade: parsed.data.grade, phone: parsed.data.phone || null })
    .eq("id", viewer.userId);
  if (error) return fail(describeDbError(error));
  revalidatePath("/settings");
  return ok(undefined, "Profile updated.");
}

export async function updateAvatar(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size === 0) return fail("Choose an image first.");
  if (!AVATAR_TYPES.includes(avatar.type)) return fail("Use a PNG, JPG or WebP image.");
  if (avatar.size > MAX_AVATAR_BYTES) return fail("Profile photos must be under 2 MB.");
  const supabase = await createClient();
  const ext = avatar.type === "image/png" ? "png" : avatar.type === "image/webp" ? "webp" : "jpg";
  const path = `${viewer.userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true, contentType: avatar.type });
  if (upErr) return fail(`Upload failed: ${upErr.message}`);
  const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", viewer.userId);
  if (error) return fail(describeDbError(error));
  revalidatePath("/", "layout");
  return ok(undefined, "Photo updated.");
}

export async function changePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  const parsed = changePasswordSchema.safeParse({ password: formData.get("password"), confirm_password: formData.get("confirm_password") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the password fields.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message);
  await logAudit({ actorId: viewer.userId, action: "password.changed", entityType: "profile", entityId: viewer.userId });
  return ok(undefined, "Password changed.");
}

export async function signOutOtherSessions(): Promise<ActionResult> {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return fail(error.message);
  await logAudit({ actorId: viewer.userId, action: "sessions.revoked_others", entityType: "profile", entityId: viewer.userId });
  return ok(undefined, "Signed out of all other devices.");
}

export async function signOutEverywhere(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?signedout=1");
}
