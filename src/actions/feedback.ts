"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { uuid } from "@/lib/validation/schemas";
import { canRecordAttendance } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";

const schema = z.object({ session_id: uuid, profile_id: uuid, body: z.string().trim().min(3, "Write a little more.").max(4000) });

/** Post-session feedback for one delegate. Same reach as attendance: chairs for their members, staff for anyone. */
export async function addSessionFeedback(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = schema.safeParse({ session_id: formData.get("session_id"), profile_id: formData.get("profile_id"), body: formData.get("body") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("committee_memberships").select("committee_id").eq("profile_id", parsed.data.profile_id);
  if (!canRecordAttendance(actor, (memberships ?? []).map((m) => m.committee_id))) return fail("You can only give feedback to members of a committee you chair.");
  const { error } = await supabase.from("session_feedback").insert({ ...parsed.data, author_id: actor.id });
  if (error) return fail(describeDbError(error));
  revalidatePath(`/sessions/${parsed.data.session_id}`);
  return ok(undefined, "Feedback sent.");
}
