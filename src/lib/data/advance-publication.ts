import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { delegationKey, displayDelegation } from "@/lib/resolutions";
import { logAudit } from "@/lib/audit";
import { broadcast } from "@/lib/realtime/server";
import { RESOLUTIONS_TOPIC, votingTopic } from "@/lib/realtime/topics";

/**
 * A delegation's newest submission replaces the resolution delegates can see.
 * If the desk has made that delegation visible, the publication moves to the
 * new document and the old voting round (which belonged to the old text) is
 * cleared. Earlier submissions stay on the desk's board with their link and
 * file. Runs with the service role because the uploader is not staff.
 */
export async function advancePublication(input: { uploadId: string; delegation: string; actorId: string }): Promise<{ replaced: boolean; delegation: string }> {
  const delegation = displayDelegation(input.delegation);
  const key = delegationKey(delegation);
  const admin = createAdminClient();
  const { data: pub } = await admin.from("resolution_publications").select("upload_id, delegation").eq("delegation_key", key).maybeSingle();
  if (!pub || pub.upload_id === input.uploadId) return { replaced: false, delegation };

  const { error } = await admin
    .from("resolution_publications")
    .update({ upload_id: input.uploadId, published_at: new Date().toISOString() })
    .eq("delegation_key", key);
  if (error) {
    console.error("[resolutions] could not advance the publication", key, error.message);
    return { replaced: false, delegation };
  }
  const { error: votingError } = await admin.from("resolution_votings").delete().eq("delegation_key", key);
  if (votingError) console.error("[resolutions] could not clear the old voting round", key, votingError.message);

  await logAudit({ actorId: input.actorId, action: "resolution.replaced", entityType: "task_upload", entityId: input.uploadId, metadata: { delegation, previous_upload_id: pub.upload_id } });
  await Promise.all([broadcast(RESOLUTIONS_TOPIC), broadcast(votingTopic(key))]);
  return { replaced: true, delegation: displayDelegation(pub.delegation) };
}

/**
 * A new task starts a clean slate: every delegation's shared resolution is
 * taken off the delegates' page and its voting round goes with it (cascade).
 * The submissions themselves stay on the desk's board with file and link.
 */
export async function clearPublications(input: { actorId: string; taskId: string }): Promise<number> {
  const admin = createAdminClient();
  const { data: pubs } = await admin.from("resolution_publications").select("delegation_key, delegation");
  const list = pubs ?? [];
  if (list.length === 0) return 0;
  const { error } = await admin
    .from("resolution_publications")
    .delete()
    .in("delegation_key", list.map((p) => p.delegation_key));
  if (error) {
    console.error("[resolutions] could not clear the shared resolutions", error.message);
    return 0;
  }
  await logAudit({ actorId: input.actorId, action: "resolutions.cleared_for_task", entityType: "task", entityId: input.taskId, metadata: { delegations: list.map((p) => p.delegation) } });
  await Promise.all([broadcast(RESOLUTIONS_TOPIC), ...list.map((p) => broadcast(votingTopic(p.delegation_key)))]);
  return list.length;
}
