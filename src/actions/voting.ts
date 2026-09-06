"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { delegationKey } from "@/lib/resolutions";
import { isVoteChoice } from "@/lib/voting";
import { logAudit } from "@/lib/audit";

function revalidate() {
  revalidatePath("/resolutions", "layout");
}

/** The desk opens (or reopens) voting on a shared resolution. Reopening keeps the votes already cast. */
export async function openVoting(input: { key: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can open voting.");
  const key = delegationKey(input.key);
  const supabase = await createClient();
  const { data: pub } = await supabase.from("resolution_publications").select("delegation_key, delegation, upload_id").eq("delegation_key", key).maybeSingle();
  if (!pub) return fail("Share the resolution with delegates before opening voting.");
  const { error } = await supabase
    .from("resolution_votings")
    .upsert({ delegation_key: key, upload_id: pub.upload_id, status: "open", opened_by: actor.id, opened_at: new Date().toISOString(), closed_at: null }, { onConflict: "delegation_key" });
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "voting.opened", entityType: "resolution_voting", entityId: null, metadata: { delegation: pub.delegation } });
  revalidate();
  return ok(undefined, `Voting on ${pub.delegation}'s resolution is open.`);
}

export async function closeVoting(input: { key: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can close voting.");
  const key = delegationKey(input.key);
  const supabase = await createClient();
  const { error } = await supabase.from("resolution_votings").update({ status: "closed", closed_at: new Date().toISOString() }).eq("delegation_key", key);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "voting.closed", entityType: "resolution_voting", entityId: null, metadata: { delegation_key: key } });
  revalidate();
  return ok(undefined, "Voting closed.");
}

/** Remove the round and every vote in it. */
export async function clearVoting(input: { key: string }): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can clear voting.");
  const key = delegationKey(input.key);
  const supabase = await createClient();
  const { error } = await supabase.from("resolution_votings").delete().eq("delegation_key", key);
  if (error) return fail(describeDbError(error));
  await logAudit({ actorId: actor.id, action: "voting.cleared", entityType: "resolution_voting", entityId: null, metadata: { delegation_key: key } });
  revalidate();
  return ok(undefined, "Votes cleared.");
}

/** A member votes, or changes their vote, while the round is open. */
export async function castVote(input: { key: string; choice: string }): Promise<ActionResult> {
  const { actor, viewer } = await getActor();
  if (isStaff(actor)) return fail("The executive desk does not vote.");
  if (!isVoteChoice(input.choice)) return fail("Choose in favour, against or abstain.");
  const key = delegationKey(input.key);
  const supabase = await createClient();
  const { data: voting } = await supabase.from("resolution_votings").select("status").eq("delegation_key", key).maybeSingle();
  if (!voting) return fail("Voting has not been opened for this resolution.");
  if (voting.status !== "open") return fail("Voting is closed.");
  const { error } = await supabase
    .from("resolution_votes")
    .upsert({ delegation_key: key, profile_id: actor.id, choice: input.choice, voter_delegation: viewer.profile.delegation, voted_at: new Date().toISOString() }, { onConflict: "delegation_key,profile_id" });
  if (error) return fail(describeDbError(error));
  return ok(undefined, "Vote recorded.");
}
