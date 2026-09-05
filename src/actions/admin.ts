"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActor } from "@/lib/auth/actor";
import { adminUserSchema, taskTemplateSchema, uuid } from "@/lib/validation/schemas";
import { isAdmin, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

function revalidate() {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard");
}

export async function setUserRole(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the admin and executives can change roles.");
  const parsed = adminUserSchema.safeParse({ profile_id: formData.get("profile_id"), role: formData.get("role") });
  if (!parsed.success) return fail("Invalid request.");
  if (parsed.data.profile_id === actor.id && parsed.data.role !== "admin") return fail("You cannot remove your own admin role.");
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("role").eq("id", parsed.data.profile_id).maybeSingle();
  if (!isAdmin(actor) && (before?.role === "admin" || parsed.data.role === "admin")) return fail("Only an admin can grant or remove the admin role.");
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.profile_id);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "user.role_changed", entityType: "profile", entityId: parsed.data.profile_id, metadata: { from: before?.role ?? null, to: parsed.data.role } });
  revalidate();
  return ok(undefined, "Role updated.");
}

/** Sets a temporary password for a member who forgot theirs. Staff only; shown once to the admin. */
export async function setTemporaryPassword(profileId: string): Promise<ActionResult<{ password: string }>> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only executives and admins can reset passwords.");
  if (!uuid.safeParse(profileId).success) return fail("Invalid member.");
  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("school_email, display_name").eq("id", profileId).maybeSingle();
  if (!target) return fail("Member not found.");
  const words = ["delegate", "caucus", "motion", "gavel", "quorum", "amend", "summit", "placard", "resolve", "chair"];
  const pick = () => words[Math.floor(Math.random() * words.length)]!;
  const password = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return fail(error.message);
  await logAudit({ actorId: actor.id, action: "user.password_reset", entityType: "profile", entityId: profileId });
  return ok({ password }, `Temporary password set for ${target.display_name ?? target.school_email}.`);
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

export async function createTaskTemplate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only executives and admins can manage templates.");
  const parsed = taskTemplateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    priority: formData.get("priority") ?? "normal",
    default_due_days: formData.get("default_due_days") ?? 7,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_templates").insert({ ...parsed.data, created_by: actor.id }).select("id").single();
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "task_template.created", entityType: "task_template", entityId: data.id, metadata: { title: parsed.data.title } });
  revalidate();
  return ok(undefined, "Template saved.");
}

export async function deleteTaskTemplate(id: string): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only executives and admins can manage templates.");
  const supabase = await createClient();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "task_template.deleted", entityType: "task_template", entityId: id });
  revalidate();
  return ok(undefined, "Template deleted.");
}

const domainSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain like school.edu");

export async function addAllowedDomain(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the admin and executives can manage domains.");
  const parsed = domainSchema.safeParse(formData.get("domain"));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid domain.");
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_email_domains").upsert({ domain: parsed.data });
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "domain.added", entityType: "allowed_email_domain", metadata: { domain: parsed.data } });
  revalidate();
  return ok(undefined, `${parsed.data} added. Remember to add it to ALLOWED_SCHOOL_DOMAINS as well.`);
}

export async function removeAllowedDomain(domain: string): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the admin and executives can manage domains.");
  const supabase = await createClient();
  const { error } = await supabase.from("allowed_email_domains").delete().eq("domain", domain);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "domain.removed", entityType: "allowed_email_domain", metadata: { domain } });
  revalidate();
  return ok(undefined, `${domain} removed.`);
}
