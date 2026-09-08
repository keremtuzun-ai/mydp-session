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
 * The programme opens on Tuesday 29 September 2026. Nothing is scheduled,
 * counted or shown before then, so the first session of the year really is
 * the first one anybody sees.
 */
const PROGRAMME_START_DAY = [2026, 8, 29] as const;
export const PROGRAMME_START = zonedInstant(...PROGRAMME_START_DAY, SLOTS[0].hour, SLOTS[0].minute);

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
    // Start scanning at the opening day while it is still ahead of us, so the
    // first weeks of the programme are published however early this runs.
    const base = now.getTime() < PROGRAMME_START.getTime() ? new Date(PROGRAMME_START_DAY[0], PROGRAMME_START_DAY[1], PROGRAMME_START_DAY[2]) : new Date(z.getFullYear(), z.getMonth(), z.getDate());
    for (let offset = 0; offset < 7 * WEEKS_AHEAD; offset++) {
      const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
      if (day.getDay() !== 2) continue;
      for (const slot of SLOTS) {
        const start = zonedInstant(day.getFullYear(), day.getMonth(), day.getDate(), slot.hour, slot.minute);
        if (start.getTime() <= now.getTime()) continue;
        if (start.getTime() < PROGRAMME_START.getTime()) continue;
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
    // Clear anything an earlier run generated before the programme opened.
    await admin.from("weekly_sessions").delete().lt("starts_at", PROGRAMME_START.toISOString());
    if (rows.length) await admin.from("weekly_sessions").upsert(rows, { onConflict: "starts_at", ignoreDuplicates: true });
    await admin.from("weekly_sessions").update({ status: "completed" }).eq("status", "published").lt("ends_at", now.toISOString());
  } catch (err) {
    console.error("ensureUpcomingSessions failed", err);
  }
});
