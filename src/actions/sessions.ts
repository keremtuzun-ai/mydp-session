"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { sessionSchema, sessionCommitteeSchema, uuid, SESSION_STATUSES } from "@/lib/validation/schemas";
import { canManageSessions, canManageCommittee } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";
import type { Enums } from "@/lib/types/database";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function sessionInput(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    theme: formData.get("theme") ?? "",
    starts_at: formData.get("starts_at") ?? "",
    ends_at: formData.get("ends_at") ?? "",
    location: formData.get("location") ?? "",
    meeting_url: formData.get("meeting_url") ?? "",
    dress_code: formData.get("dress_code") ?? "",
    general_agenda: formData.get("general_agenda") ?? "",
    status: formData.get("status") ?? "draft",
  };
}

function revalidateSessions(id?: string) {
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  if (id) revalidatePath(`/sessions/${id}`);
}

export async function createSession(_prev: ActionResult | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { actor } = await getActor();
  if (!canManageSessions(actor)) return fail("Only executives and admins can schedule sessions.");
  const parsed = sessionSchema.safeParse(sessionInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const { committee_ids: _unused, ...session } = parsed.data;
  void _unused;
  const supabase = await createClient();
  const { data, error } = await supabase.from("weekly_sessions").insert({ ...session, created_by: actor.id }).select("id").single();
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "session.created", entityType: "weekly_session", entityId: data.id, metadata: { title: session.title } });
  revalidateSessions(data.id);
  redirect(`/sessions/${data.id}`);
}

export async function updateSession(sessionId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!canManageSessions(actor)) return fail("Only executives and admins can edit sessions.");
  if (!uuid.safeParse(sessionId).success) return fail("Invalid session.");
  const parsed = sessionSchema.safeParse(sessionInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const { committee_ids: _unused, ...session } = parsed.data;
  void _unused;
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_sessions").update(session).eq("id", sessionId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "session.updated", entityType: "weekly_session", entityId: sessionId });
  revalidateSessions(sessionId);
  return ok(undefined, "Session updated.");
}

export async function setSessionStatus(sessionId: string, status: Enums<"session_status">): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!canManageSessions(actor)) return fail("Only executives and admins can change session status.");
  if (!SESSION_STATUSES.includes(status)) return fail("Invalid status.");
  const supabase = await createClient();
  const { error } = await supabase.from("weekly_sessions").update({ status }).eq("id", sessionId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: `session.${status}`, entityType: "weekly_session", entityId: sessionId });
  revalidateSessions(sessionId);
  return ok(undefined, `Session marked ${status}.`);
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!canManageSessions(actor)) return fail("Only executives and admins can delete sessions.");
  const supabase = await createClient();
  const { data: s } = await supabase.from("weekly_sessions").select("title").eq("id", sessionId).maybeSingle();
  const { error } = await supabase.from("weekly_sessions").delete().eq("id", sessionId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "session.deleted", entityType: "weekly_session", entityId: sessionId, metadata: { title: s?.title ?? null } });
  revalidateSessions();
  redirect("/sessions");
}

/** Chairs edit their own committee block; staff edit any. */
export async function updateSessionCommittee(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = sessionCommitteeSchema.safeParse({
    session_committee_id: formData.get("session_committee_id"),
    topic: formData.get("topic") ?? "",
    agenda: formData.get("agenda") ?? "",
    chair_notes: formData.get("chair_notes") ?? "",
  });
  if (!parsed.success) return fail("Check the fields.", fieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("session_committees")
    .select("id, session_id, committee_id")
    .eq("id", parsed.data.session_committee_id)
    .maybeSingle();
  if (!row) return fail("Committee block not found.");
  if (!canManageCommittee(actor, row.committee_id)) return fail("You can only edit the block for a committee you chair.");
  const { error } = await supabase
    .from("session_committees")
    .update({ topic: parsed.data.topic, agenda: parsed.data.agenda, chair_notes: parsed.data.chair_notes })
    .eq("id", row.id);
  if (error) return fail(describeDbError(error));
  revalidateSessions(row.session_id);
  return ok(undefined, "Committee agenda saved.");
}
