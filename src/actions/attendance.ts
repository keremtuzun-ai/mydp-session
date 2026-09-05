"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { uuid, ATTENDANCE_STATUSES } from "@/lib/validation/schemas";
import { isStaff } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";

const bulkSchema = z.object({
  attended_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date"),
  entries: z.array(z.object({ profile_id: uuid, status: z.enum(ATTENDANCE_STATUSES), note: z.string().trim().max(500).optional() })).min(1).max(500),
});

/** Roll call for a date the executive types. Staff only. */
export async function bulkRecordAttendance(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk records attendance.");
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid attendance data.");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("attendance_records").upsert(
    parsed.data.entries.map((e) => ({ attended_on: parsed.data.attended_on, profile_id: e.profile_id, status: e.status, note: e.note || null, recorded_by: actor.id, recorded_at: now })),
    { onConflict: "attended_on,profile_id" },
  );
  if (error) return fail(describeDbError(error));
  for (const p of ["/attendance", "/dashboard", "/analytics", "/exec/attendance"]) revalidatePath(p);
  return ok(undefined, `Attendance saved for ${parsed.data.entries.length} member${parsed.data.entries.length === 1 ? "" : "s"}.`);
}
