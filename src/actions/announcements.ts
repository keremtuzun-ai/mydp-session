"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { announcementSchema, uuid } from "@/lib/validation/schemas";
import { canPostAnnouncement, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function input(formData: FormData) {
  return {
    title: formData.get("title"),
    author_name: formData.get("author_name") ?? "",
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on" || formData.get("pinned") === "true",
    target_role: formData.get("target_role") ?? "",
    target_committee_id: formData.get("target_committee_id") ?? "",
    target_session_id: formData.get("target_session_id") ?? "",
  };
}

function revalidate() {
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  revalidatePath("/sessions", "layout");
  revalidatePath("/committees", "layout");
}

export async function createAnnouncement(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = announcementSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  if (!canPostAnnouncement(actor, parsed.data.target_committee_id)) {
    return fail("Chairs can only post announcements to a committee they chair.");
  }
  if (!isStaff(actor) && (parsed.data.target_role || parsed.data.pinned)) return fail("Only executives and admins can target roles or pin.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").insert({ ...parsed.data, author_id: actor.id }).select("id").single();
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "announcement.created", entityType: "announcement", entityId: data.id, metadata: { title: parsed.data.title } });
  revalidate();
  return ok(undefined, "Announcement published.");
}

export async function updateAnnouncement(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(id).success) return fail("Invalid announcement.");
  const parsed = announcementSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  if (!canPostAnnouncement(actor, parsed.data.target_committee_id)) return fail("You cannot retarget this announcement.");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update(parsed.data).eq("id", id);
  if (error) return fail(describeDbError(error));
  revalidate();
  return ok(undefined, "Announcement updated.");
}

export async function togglePin(id: string, pinned: boolean): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only executives and admins can pin announcements.");
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ pinned }).eq("id", id);
  if (error) return fail(describeDbError(error));
  revalidate();
  return ok(undefined, pinned ? "Pinned." : "Unpinned.");
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: a } = await supabase.from("announcements").select("id, title, author_id").eq("id", id).maybeSingle();
  if (!a) return fail("Announcement not found.");
  if (a.author_id !== actor.id && !isStaff(actor)) return fail("You cannot delete this announcement.");
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "announcement.deleted", entityType: "announcement", entityId: id, metadata: { title: a.title } });
  revalidate();
  return ok(undefined, "Announcement deleted.");
}

export async function markAnnouncementRead(id: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { error } = await supabase.from("announcement_reads").upsert({ announcement_id: id, profile_id: actor.id }, { onConflict: "announcement_id,profile_id" });
  if (error) return fail(describeDbError(error));
  revalidatePath("/announcements");
  return ok(undefined);
}
