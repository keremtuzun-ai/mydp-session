import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedInstant, zonedNow } from "@/lib/utils";

/** The club meets every Tuesday: 10:55 in 1S and 15:10 in the Library (programme timezone). */
const SLOTS = [
  { hour: 10, minute: 55, minutes: 45, title: "Tuesday morning session", location: "1S" },
  { hour: 15, minute: 10, minutes: 45, title: "Tuesday afternoon session", location: "Library" },
] as const;
const WEEKS_AHEAD = 6;

/**
 * Keeps the calendar rolling on its own: every upcoming Tuesday for the next
 * few weeks has both sessions published, and sessions whose time has passed
 * are marked completed. Idempotent (unique on starts_at) and cached per
 * request, so pages can call it freely.
 */
export const ensureUpcomingSessions = cache(async () => {
  try {
    const admin = createAdminClient();
    const now = new Date();
    const z = zonedNow();
    const rows: { title: string; description: string; starts_at: string; ends_at: string; location: string; status: "published" }[] = [];
    for (let offset = 0; offset < 7 * WEEKS_AHEAD; offset++) {
      const day = new Date(z.getFullYear(), z.getMonth(), z.getDate() + offset);
      if (day.getDay() !== 2) continue;
      for (const slot of SLOTS) {
        const start = zonedInstant(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
        if (start.getTime() <= now.getTime()) continue;
        rows.push({
          title: slot.title,
          description: "Weekly session of the Koç MUN Club.",
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + slot.minutes * 60_000).toISOString(),
          location: slot.location,
          status: "published",
        });
      }
    }
    if (rows.length) await admin.from("weekly_sessions").upsert(rows, { onConflict: "starts_at", ignoreDuplicates: true });
    await admin.from("weekly_sessions").update({ status: "completed" }).eq("status", "published").lt("ends_at", now.toISOString());
  } catch (err) {
    console.error("ensureUpcomingSessions failed", err);
  }
});
