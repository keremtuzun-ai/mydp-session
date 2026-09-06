"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { isStaff } from "@/lib/policy";
import { uuid } from "@/lib/validation/schemas";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { delegationKey, displayDelegation, isNoDelegation } from "@/lib/resolutions";
import { logAudit } from "@/lib/audit";

function revalidate() {
  revalidatePath("/resolutions", "layout");
  revalidatePath("/dashboard");
}

/** The desk shows one delegation's document to every member. Replaces the previous choice for that delegation. */
export async function publishResolution(input: { uploadId: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can share resolutions.");
  if (!uuid.safeParse(input.uploadId).success) return fail("Invalid document.");
  const supabase = await createClient();
  const { data: upload } = await supabase.from("task_uploads").select("id, delegation, storage_path").eq("id", input.uploadId).maybeSingle();
  if (!upload) return fail("Document not found.");
  if (!upload.storage_path) return fail("This submission has no file to show. Ask the delegate to submit the file.");
  if (isNoDelegation(upload.delegation)) return fail("This submission is not affiliated with a delegation.");
  const delegation = displayDelegation(upload.delegation ?? "");
  const key = delegationKey(delegation);
  const { error } = await supabase
    .from("resolution_publications")
    .upsert({ delegation_key: key, delegation, upload_id: upload.id, published_by: actor.id, published_at: new Date().toISOString() }, { onConflict: "delegation_key" });
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "resolution.published", entityType: "task_upload", entityId: upload.id, metadata: { delegation } });
  revalidate();
  return ok(undefined, `${delegation}'s resolution is now visible to delegates.`);
}

/** Hide a delegation's resolution again (the default state). */
export async function unpublishResolution(input: { key: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can share resolutions.");
  const key = delegationKey(input.key);
  if (!key) return fail("Invalid delegation.");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("resolution_publications").select("delegation").eq("delegation_key", key).maybeSingle();
  const { error } = await supabase.from("resolution_publications").delete().eq("delegation_key", key);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "resolution.hidden", entityType: "resolution_publication", entityId: null, metadata: { delegation: existing?.delegation ?? key } });
  revalidate();
  return ok(undefined, `${existing?.delegation ?? "The"} resolution is hidden from delegates.`);
}
