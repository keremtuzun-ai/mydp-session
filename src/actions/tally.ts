"use server";

import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { isStaff } from "@/lib/policy";
import { uuid } from "@/lib/validation/schemas";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { delegationKey, displayDelegation, isNoDelegation } from "@/lib/resolutions";
import { isTallyKind } from "@/lib/tally";
import { broadcast } from "@/lib/realtime/server";
import { tallyTopic } from "@/lib/realtime/topics";

export type TallyCounts = { speeches: number; pois: number; objections: number };

/** Add or take away one speech, POI or objection for a country on a task. */
export async function bumpTally(input: { taskId: string; country: string; kind: string; delta: number }): Promise<ActionResult<TallyCounts>> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can tally.");
  if (!uuid.safeParse(input.taskId).success || !isTallyKind(input.kind) || (input.delta !== 1 && input.delta !== -1) || isNoDelegation(input.country)) {
    return fail("Invalid request.");
  }
  const country = displayDelegation(input.country).slice(0, 60);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bump_tally", { t: input.taskId, k: delegationKey(country), label: country, kind: input.kind, delta: input.delta });
  if (error || !data) return fail(error ? describeDbError(error) : "Could not save the count.");
  await broadcast(tallyTopic(input.taskId));
  return ok({ speeches: data.speeches, pois: data.pois, objections: data.objections });
}
