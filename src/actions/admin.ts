"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActor } from "@/lib/auth/actor";
import { adminUserSchema, uuid } from "@/lib/validation/schemas";
import { isMemberTier } from "@/lib/auth/access-code";
import { isAdmin, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

function revalidate() {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard");
}

export async function setUserRole(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the admin and executives can change roles.");
  const parsed = adminUserSchema.safeParse({ profile_id: formData.get("profile_id"), role: formData.get("role") });
  if (!parsed.success) return fail("Invalid request.");
  const tierRaw = formData.get("tier");
  const tier = tierRaw === "" || tierRaw === null ? null : isMemberTier(tierRaw) ? tierRaw : undefined;
  if (tier === undefined) return fail("Invalid request.");
  if (parsed.data.profile_id === actor.id && parsed.data.role !== "admin") return fail("You cannot remove your own admin role.");
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("role, tier").eq("id", parsed.data.profile_id).maybeSingle();
  if (!isAdmin(actor) && (before?.role === "admin" || parsed.data.role === "admin")) return fail("Only an admin can grant or remove the admin role.");
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role, tier }).eq("id", parsed.data.profile_id);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "user.role_changed", entityType: "profile", entityId: parsed.data.profile_id, metadata: { from: before?.role ?? null, to: parsed.data.role, tier_from: before?.tier ?? null, tier_to: tier } });
  revalidate();
  return ok(undefined, "Member updated.");
}

/** Removes the auth user (profile cascades). Admin only, service-role required. */
export async function deleteUser(profileId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the admin and executives can remove members.");
  if (!uuid.safeParse(profileId).success) return fail("Invalid member.");
  if (profileId === actor.id) return fail("You cannot remove yourself.");
  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("school_email, username, role").eq("id", profileId).maybeSingle();
  if (!target) return fail("Member not found.");
  if (target.role === "admin" && !isAdmin(actor)) return fail("Only an admin can remove an admin.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return fail(error.message);
  await logAudit({ actorId: actor.id, action: "user.deleted", entityType: "profile", entityId: profileId, metadata: { username: target.username, email: target.school_email } });
  revalidate();
  return ok(undefined, "Member removed.");
}
