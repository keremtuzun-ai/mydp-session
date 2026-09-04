"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { materialSchema, uuid } from "@/lib/validation/schemas";
import { safeFileName } from "@/lib/validation/files";
import { MAX_UPLOAD_BYTES } from "@/lib/env";
import { canUploadMaterial, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

const MATERIAL_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "audio/mpeg",
]);

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function input(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    category: formData.get("category"),
    committee_id: formData.get("committee_id") ?? "",
    session_id: formData.get("session_id") ?? "",
    visibility: formData.get("visibility") ?? "everyone",
    external_url: formData.get("external_url") ?? "",
  };
}

function revalidate() {
  revalidatePath("/materials");
  revalidatePath("/sessions", "layout");
  revalidatePath("/committees", "layout");
}

export async function createMaterial(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = materialSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const data = parsed.data;
  if (!canUploadMaterial(actor, data.committee_id)) return fail("Chairs can only add materials for a committee they chair.");
  if (data.visibility === "committee" && !data.committee_id) return fail("Committee-only materials need a committee.");
  if (!isStaff(actor) && data.visibility === "staff") return fail("Only executives and admins can restrict materials to staff.");

  const supabase = await createClient();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !data.external_url) return fail("Attach a file or provide a link.");

  let storage_path: string | null = null;
  let file_name: string | null = null;
  let mime_type: string | null = null;
  let size_bytes: number | null = null;
  if (hasFile) {
    if (!MATERIAL_TYPES.has(file.type)) return fail("Unsupported file type. Use PDF, DOCX, PPTX, PNG, JPG, MP4 or MP3.");
    if (file.size > MAX_UPLOAD_BYTES * 3) return fail("That file is too large.");
    storage_path = `${randomUUID()}/${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("materials").upload(storage_path, file, { contentType: file.type });
    if (upErr) return fail(`Upload failed: ${upErr.message}`);
    file_name = file.name;
    mime_type = file.type;
    size_bytes = file.size;
  }

  const { data: row, error } = await supabase
    .from("materials")
    .insert({ ...data, uploaded_by: actor.id, storage_path, file_name, mime_type, size_bytes })
    .select("id")
    .single();
  if (error) {
    if (storage_path) await supabase.storage.from("materials").remove([storage_path]);
    return fail(describeDbError(error));
  }
  await logAudit({ actorId: actor.id, action: "material.created", entityType: "material", entityId: row.id, metadata: { title: data.title } });
  revalidate();
  return ok(undefined, "Material added.");
}

export async function updateMaterial(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(id).success) return fail("Invalid material.");
  const parsed = materialSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  if (!canUploadMaterial(actor, parsed.data.committee_id)) return fail("You cannot move this material to that committee.");
  const supabase = await createClient();
  const { error } = await supabase.from("materials").update(parsed.data).eq("id", id);
  if (error) return fail(describeDbError(error));
  revalidate();
  return ok(undefined, "Material updated.");
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: m } = await supabase.from("materials").select("id, title, storage_path, uploaded_by, committee_id").eq("id", id).maybeSingle();
  if (!m) return fail("Material not found.");
  if (m.uploaded_by !== actor.id && !canUploadMaterial(actor, m.committee_id)) return fail("You cannot delete this material.");
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) return fail(describeDbError(error));
  if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
  await logAudit({ actorId: actor.id, action: "material.deleted", entityType: "material", entityId: id, metadata: { title: m.title } });
  revalidate();
  return ok(undefined, "Material deleted.");
}
