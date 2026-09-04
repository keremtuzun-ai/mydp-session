"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { committeeSchema, membershipSchema, uuid } from "@/lib/validation/schemas";
import { validateEvidenceFile, uploadMetaSchema, safeFileName } from "@/lib/validation/files";
import { canManageCommittee, canSubmitToCommittee, isStaff, isAdmin } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function committeeInput(formData: FormData) {
  return {
    acronym: formData.get("acronym"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    current_topic: formData.get("current_topic") ?? "",
    background_guide_url: formData.get("background_guide_url") ?? "",
    is_open: formData.get("is_open") === "on" || formData.get("is_open") === "true",
    submissions_enabled: formData.get("submissions_enabled") === "on" || formData.get("submissions_enabled") === "true",
  };
}

function revalidateCommittees(slug?: string) {
  revalidatePath("/committees");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  if (slug) revalidatePath(`/committees/${slug}`);
}

export async function createCommittee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only executives and admins can create committees.");
  const parsed = committeeSchema.safeParse(committeeInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data, error } = await supabase.from("committees").insert(parsed.data).select("id, slug").single();
  if (error) return fail(error.code === "23505" ? "A committee with that slug already exists." : describeDbError(error));
  await logAudit({ actorId: actor.id, action: "committee.created", entityType: "committee", entityId: data.id, metadata: { slug: data.slug } });
  revalidateCommittees(data.slug);
  redirect(`/committees/${data.slug}`);
}

export async function updateCommittee(committeeId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(committeeId).success) return fail("Invalid committee.");
  if (!canManageCommittee(actor, committeeId)) return fail("You can only edit a committee you chair.");
  const parsed = committeeSchema.safeParse(committeeInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const supabase = await createClient();
  // Chairs may not rename or re-slug; staff may.
  const patch = isStaff(actor)
    ? parsed.data
    : { description: parsed.data.description, current_topic: parsed.data.current_topic, background_guide_url: parsed.data.background_guide_url, is_open: parsed.data.is_open, submissions_enabled: parsed.data.submissions_enabled };
  const { data, error } = await supabase.from("committees").update(patch).eq("id", committeeId).select("slug").single();
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "committee.updated", entityType: "committee", entityId: committeeId });
  revalidateCommittees(data.slug);
  return ok(undefined, "Committee updated.");
}

export async function deleteCommittee(committeeId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isAdmin(actor)) return fail("Only admins can delete committees.");
  const supabase = await createClient();
  const { data: c } = await supabase.from("committees").select("slug, name").eq("id", committeeId).maybeSingle();
  const { error } = await supabase.from("committees").delete().eq("id", committeeId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "committee.deleted", entityType: "committee", entityId: committeeId, metadata: { name: c?.name ?? null } });
  revalidateCommittees();
  return ok(undefined, "Committee deleted.");
}

export async function upsertMembership(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  // Members can be added by username (resolved through the non-private view) or by id.
  let profileId = String(formData.get("profile_id") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!profileId && username) {
    const lookup = await createClient();
    const { data: found } = await lookup.from("public_profiles").select("id").eq("username", username).maybeSingle();
    if (!found) return fail(`No member with the username “${username}”.`);
    profileId = found.id;
  }
  const parsed = membershipSchema.safeParse({
    committee_id: formData.get("committee_id"),
    profile_id: profileId,
    membership_role: formData.get("membership_role") ?? "delegate",
    delegation: formData.get("delegation") ?? "",
  });
  if (!parsed.success) return fail("Check the fields.", fieldErrors(parsed.error.issues));
  if (!canManageCommittee(actor, parsed.data.committee_id)) return fail("You can only manage members of a committee you chair.");
  if (!isStaff(actor) && parsed.data.membership_role !== "delegate") return fail("Only executives and admins can appoint chairs.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("committee_memberships")
    .upsert(parsed.data, { onConflict: "profile_id,committee_id" });
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "membership.upserted", entityType: "committee", entityId: parsed.data.committee_id, metadata: { profile_id: parsed.data.profile_id, role: parsed.data.membership_role } });
  const { data: c } = await supabase.from("committees").select("slug").eq("id", parsed.data.committee_id).maybeSingle();
  revalidateCommittees(c?.slug);
  return ok(undefined, "Membership saved.");
}

export async function removeMembership(membershipId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: m } = await supabase.from("committee_memberships").select("id, committee_id, profile_id, committees ( slug )").eq("id", membershipId).maybeSingle();
  if (!m) return fail("Membership not found.");
  if (!canManageCommittee(actor, m.committee_id)) return fail("You can only manage members of a committee you chair.");
  const { error } = await supabase.from("committee_memberships").delete().eq("id", membershipId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "membership.removed", entityType: "committee", entityId: m.committee_id, metadata: { profile_id: m.profile_id } });
  revalidateCommittees(m.committees?.slug);
  return ok(undefined, "Member removed.");
}

/** Position-paper / preparation submission by a committee member. */
export async function submitToCommittee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const committeeId = String(formData.get("committee_id") ?? "");
  if (!uuid.safeParse(committeeId).success) return fail("Invalid committee.");
  const meta = uploadMetaSchema.safeParse({ title: formData.get("title"), notes: formData.get("notes") ?? "" });
  if (!meta.success) return fail(meta.error.issues[0]?.message ?? "Check the details.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to submit.");
  const valid = validateEvidenceFile({ name: file.name, type: file.type, size: file.size });
  if (!valid.ok) return fail(valid.error);

  const supabase = await createClient();
  const { data: committee } = await supabase.from("committees").select("id, slug, submissions_enabled").eq("id", committeeId).maybeSingle();
  if (!committee) return fail("Committee not found.");
  if (!canSubmitToCommittee(actor, committee)) return fail("Submissions are closed, or you are not a member of this committee.");

  const path = `${committeeId}/${actor.id}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage.from("committee-submissions").upload(path, file, { contentType: file.type });
  if (upErr) return fail(`Upload failed: ${upErr.message}`);
  const { error } = await supabase.from("committee_submissions").insert({
    committee_id: committeeId,
    profile_id: actor.id,
    title: meta.data.title,
    notes: meta.data.notes || null,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from("committee-submissions").remove([path]);
    return fail(describeDbError(error));
  }
  revalidateCommittees(committee.slug);
  return ok(undefined, "Submission received.");
}

export async function deleteSubmission(submissionId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: s } = await supabase.from("committee_submissions").select("id, committee_id, profile_id, storage_path, committees ( slug )").eq("id", submissionId).maybeSingle();
  if (!s) return fail("Submission not found.");
  if (s.profile_id !== actor.id && !canManageCommittee(actor, s.committee_id)) return fail("You cannot remove this submission.");
  const { error } = await supabase.from("committee_submissions").delete().eq("id", submissionId);
  if (error) return fail(describeDbError(error));
  await supabase.storage.from("committee-submissions").remove([s.storage_path]);
  revalidateCommittees(s.committees?.slug);
  return ok(undefined, "Submission removed.");
}
