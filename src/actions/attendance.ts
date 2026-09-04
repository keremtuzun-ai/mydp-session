"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { attendanceSchema, uuid, ATTENDANCE_STATUSES } from "@/lib/validation/schemas";
import { canRecordAttendance, isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";

function revalidate(sessionId: string) {
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath(`/sessions/${sessionId}`);
}

async function subjectCommittees(profileIds: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.from("committee_memberships").select("profile_id, committee_id").in("profile_id", profileIds);
  const map = new Map<string, string[]>();
  for (const m of data ?? []) map.set(m.profile_id, [...(map.get(m.profile_id) ?? []), m.committee_id]);
  return map;
}

export async function recordAttendance(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = attendanceSchema.safeParse({
    session_id: formData.get("session_id"),
    profile_id: formData.get("profile_id"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const subjects = await subjectCommittees([parsed.data.profile_id]);
  if (!canRecordAttendance(actor, subjects.get(parsed.data.profile_id) ?? [])) {
    return fail("You can only record attendance for members of a committee you chair.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("attendance_records").upsert(
    { ...parsed.data, recorded_by: actor.id, recorded_at: new Date().toISOString() },
    { onConflict: "session_id,profile_id" },
  );
  if (error) return fail(describeDbError(error));
  revalidate(parsed.data.session_id);
  return ok(undefined, "Attendance saved.");
}

const bulkSchema = z.object({
  session_id: uuid,
  entries: z.array(z.object({ profile_id: uuid, status: z.enum(ATTENDANCE_STATUSES), note: z.string().trim().max(500).optional() })).min(1).max(500),
});

/** Roll-call style save for a whole committee (or whole session for staff). */
export async function bulkRecordAttendance(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid attendance data.");
  const ids = parsed.data.entries.map((e) => e.profile_id);
  const subjects = await subjectCommittees(ids);
  if (!isStaff(actor)) {
    const blocked = ids.filter((id) => !canRecordAttendance(actor, subjects.get(id) ?? []));
    if (blocked.length) return fail("Some members are not in a committee you chair.");
  }
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("attendance_records").upsert(
    parsed.data.entries.map((e) => ({ session_id: parsed.data.session_id, profile_id: e.profile_id, status: e.status, note: e.note || null, recorded_by: actor.id, recorded_at: now })),
    { onConflict: "session_id,profile_id" },
  );
  if (error) return fail(describeDbError(error));
  revalidate(parsed.data.session_id);
  return ok(undefined, `Attendance saved for ${parsed.data.entries.length} member${parsed.data.entries.length === 1 ? "" : "s"}.`);
}
