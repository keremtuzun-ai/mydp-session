"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { taskSchema, uuid, TASK_STATUSES } from "@/lib/validation/schemas";
import { validateEvidenceFile, uploadMetaSchema, safeFileName } from "@/lib/validation/files";
import { canCreateTask, canManageTask, canDelegateSetStatus, canUploadEvidence, canViewTask, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";
import type { Enums } from "@/lib/types/database";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function taskFormInput(formData: FormData) {
  return {
    title: formData.get("title"),
    author_name: formData.get("author_name") ?? "",
    description: formData.get("description") ?? "",
    committee_label: formData.get("committee_label") ?? "",
    assigned_to_profile_id: formData.get("assigned_to_profile_id") ?? "",
    assigned_role: formData.get("assigned_role") ?? "",
    assigned_committee_id: formData.get("assigned_committee_id") ?? "",
    session_id: formData.get("session_id") ?? "",
    due_at: formData.get("due_at") ?? "",
    priority: formData.get("priority") ?? "normal",
  };
}

function revalidateTaskViews(taskId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/sessions", "layout");
  revalidatePath("/committees", "layout");
  if (taskId) revalidatePath(`/calendar/${taskId}`);
}

export async function createTask(_prev: ActionResult | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { actor } = await getActor();
  const parsed = taskSchema.safeParse(taskFormInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const input = parsed.data;
  if (!input.assigned_to_profile_id && !input.assigned_role && !input.assigned_committee_id) {
    input.assigned_role = "delegate"; // "everyone": every delegate sees it
  }
  if (!canCreateTask(actor, input.assigned_committee_id)) {
    return fail(isStaff(actor) ? "You cannot create this task." : "Chairs can only create tasks for a committee they chair.");
  }
  if (!isStaff(actor) && input.assigned_role) return fail("Chairs cannot assign tasks to a whole role.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, created_by: actor.id })
    .select("id")
    .single();
  if (error) return fail(describeDbError(error));
  revalidateTaskViews(data.id);
  return ok({ id: data.id }, "Task created.");
}

export async function updateTask(taskId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(taskId).success) return fail("Invalid task.");
  const parsed = taskSchema.safeParse(taskFormInput(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data: existing } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!existing) return fail("Task not found.");
  if (!canManageTask(actor, existing) || !canCreateTask(actor, parsed.data.assigned_committee_id)) {
    return fail("You can only edit tasks for a committee you manage.");
  }
  const { error } = await supabase.from("tasks").update(parsed.data).eq("id", taskId);
  if (error) return fail(describeDbError(error));
  revalidateTaskViews(taskId);
  return ok(undefined, "Task updated.");
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("tasks").select("id, title, assigned_committee_id").eq("id", taskId).maybeSingle();
  if (!existing) return fail("Task not found.");
  if (!canManageTask(actor, existing)) return fail("You cannot delete this task.");
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "task.deleted", entityType: "task", entityId: taskId, metadata: { title: existing.title } });
  revalidateTaskViews();
  return ok(undefined, "Task deleted.");
}

type Status = Enums<"task_status">;

/**
 * Status transitions. Delegates: not_started / in_progress / submitted on their
 * own task. Chairs and staff: any status, with an optional note that is written
 * to the activity log (returned = "reviewed", completed, reopened).
 */
export async function setTaskStatus(input: { taskId: string; status: Status; note?: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(input.taskId).success || !TASK_STATUSES.includes(input.status)) return fail("Invalid request.");
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", input.taskId).maybeSingle();
  if (!task || !canViewTask(actor, task)) return fail("Task not found.");

  const manager = canManageTask(actor, task);
  if (!manager && !canDelegateSetStatus(actor, task, input.status)) {
    return fail(task.status === "reviewed" || task.status === "completed"
      ? "This task has been closed by a chair."
      : "You can only mark your own task as not started, in progress or submitted.");
  }

  const closing = input.status === "reviewed" || input.status === "completed";
  const { error } = await supabase
    .from("tasks")
    .update(
      manager
        ? {
            status: input.status,
            reviewed_by: closing ? actor.id : null,
            reviewed_at: closing ? new Date().toISOString() : null,
            review_note: closing ? input.note?.trim() || null : null,
          }
        : { status: input.status },
    )
    .eq("id", input.taskId);
  if (error) return fail(describeDbError(error));

  if (manager) {
    const action = input.status === "reviewed" ? "returned" : input.status === "completed" ? "completed" : "reopened";
    await supabase.from("task_activity").insert({ task_id: input.taskId, actor_id: actor.id, action, metadata: { note: input.note?.trim() || null } });
  }
  revalidateTaskViews(input.taskId);
  return ok(undefined, "Status updated.");
}

/** Submit work on a task: a file (PDF, PNG, JPG, DOCX) and/or a document link such as a Google Doc. */
export async function uploadEvidence(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const taskId = String(formData.get("task_id") ?? "");
  if (!uuid.safeParse(taskId).success) return fail("Invalid task.");
  const meta = uploadMetaSchema.safeParse({ title: formData.get("title"), notes: formData.get("notes") ?? "", external_url: formData.get("external_url") ?? "" });
  if (!meta.success) return fail(meta.error.issues[0]?.message ?? "Check the upload details.");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const link = meta.data.external_url || null;
  if (!hasFile && !link) return fail("Attach a file or paste a document link.");
  if (hasFile) {
    const valid = validateEvidenceFile({ name: file.name, type: file.type, size: file.size });
    if (!valid.ok) return fail(valid.error);
  }

  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task || !canViewTask(actor, task)) return fail("Task not found.");
  if (!canUploadEvidence(actor, task)) return fail("Uploads are closed for this task.");

  let path: string | null = null;
  if (hasFile) {
    path = `${taskId}/${randomUUID()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("task-evidence").upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return fail(`Upload failed: ${upErr.message}`);
  }

  const { error } = await supabase.from("task_uploads").insert({
    task_id: taskId,
    uploaded_by: actor.id,
    title: meta.data.title,
    notes: meta.data.notes || null,
    storage_path: path,
    external_url: link,
    file_name: hasFile ? file.name : null,
    mime_type: hasFile ? file.type : null,
    size_bytes: hasFile ? file.size : null,
  });
  if (error) {
    if (path) await supabase.storage.from("task-evidence").remove([path]);
    return fail(describeDbError(error));
  }
  revalidateTaskViews(taskId);
  return ok(undefined, hasFile ? "Work uploaded." : "Document link saved.");
}

export async function deleteUpload(uploadId: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: upload } = await supabase.from("task_uploads").select("id, task_id, storage_path, uploaded_by, title").eq("id", uploadId).maybeSingle();
  if (!upload) return fail("Upload not found.");
  const { data: task } = await supabase.from("tasks").select("assigned_committee_id").eq("id", upload.task_id).maybeSingle();
  if (upload.uploaded_by !== actor.id && !(task && canManageTask(actor, task))) return fail("You cannot remove this upload.");
  const { error } = await supabase.from("task_uploads").delete().eq("id", uploadId);
  if (error) return fail(describeDbError(error));
  if (upload.storage_path) await supabase.storage.from("task-evidence").remove([upload.storage_path]);
  await supabase.from("task_activity").insert({ task_id: upload.task_id, actor_id: actor.id, action: "evidence_removed", metadata: { title: upload.title } });
  revalidateTaskViews(upload.task_id);
  return ok(undefined, "Upload removed.");
}

export async function assignFromTemplate(input: { templateId: string; assigneeIds: string[]; committeeId: string | null; sessionId: string | null }): Promise<ActionResult> {
  const { actor, viewer } = await getActor();
  if (!canCreateTask(actor, input.committeeId)) return fail("You cannot assign tasks here.");
  const supabase = await createClient();
  const { data: template } = await supabase.from("task_templates").select("*").eq("id", input.templateId).maybeSingle();
  if (!template) return fail("Template not found.");
  const due = new Date();
  due.setDate(due.getDate() + template.default_due_days);
  const rows = input.assigneeIds.filter((id) => uuid.safeParse(id).success).map((id) => ({
    title: template.title,
    description: template.description,
    priority: template.priority,
    assigned_to_profile_id: id,
    assigned_committee_id: input.committeeId,
    session_id: input.sessionId,
    due_at: due.toISOString(),
    created_by: actor.id,
    author_name: viewer.profile.display_name,
  }));
  if (rows.length === 0) return fail("Choose at least one member.");
  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return fail(describeDbError(error));
  revalidateTaskViews();
  return ok(undefined, `${rows.length} task${rows.length === 1 ? "" : "s"} assigned.`);
}
