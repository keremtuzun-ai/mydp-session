import "server-only";
import type { Viewer } from "@/lib/auth/session";
import { listAssignableMembers, type Db } from "@/lib/data/queries";

/** Options for the task form, limited to what the viewer may target. */
export async function loadTaskFormData(db: Db, viewer: Viewer) {
  const [{ data: committees }, { data: sessions }, members] = await Promise.all([
    viewer.isStaff
      ? db.from("committees").select("id, acronym, name").order("acronym")
      : db.from("committees").select("id, acronym, name").in("id", viewer.chairedCommitteeIds.length ? viewer.chairedCommitteeIds : ["00000000-0000-0000-0000-000000000000"]).order("acronym"),
    db.from("weekly_sessions").select("id, title, starts_at").gte("starts_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("starts_at"),
    listAssignableMembers(db, viewer.isStaff ? "all" : viewer.chairedCommitteeIds),
  ]);
  return { committees: committees ?? [], sessions: sessions ?? [], members };
}
