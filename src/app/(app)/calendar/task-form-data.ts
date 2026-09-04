import "server-only";
import type { Viewer } from "@/lib/auth/session";
import { listAssignableMembers, type Db } from "@/lib/data/queries";

/** Options for the task form: every onboarded member (staff) or the chair's committee members. */
export async function loadTaskFormData(db: Db, viewer: Viewer) {
  const [{ data: committees }, { data: sessions }, members, { data: everyone }, { data: labels }] = await Promise.all([
    viewer.isStaff ? Promise.resolve({ data: [] as { id: string; acronym: string; name: string }[] }) : db.from("committees").select("id, acronym, name").in("id", viewer.chairedCommitteeIds.length ? viewer.chairedCommitteeIds : ["00000000-0000-0000-0000-000000000000"]).order("acronym"),
    db.from("weekly_sessions").select("id, title, starts_at").gte("starts_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("starts_at"),
    viewer.isStaff ? Promise.resolve([] as { id: string; name: string; committee_id: string }[]) : listAssignableMembers(db, viewer.chairedCommitteeIds),
    viewer.isStaff ? db.from("public_profiles").select("id, display_name, username, role").not("display_name", "is", null).order("display_name") : Promise.resolve({ data: [] as { id: string; display_name: string | null; username: string | null; role: string }[] }),
    db.from("tasks").select("committee_label").not("committee_label", "is", null).order("created_at", { ascending: false }).limit(100),
  ]);
  const all = (everyone ?? []).map((p) => ({ id: p.id, name: `${p.display_name ?? p.username ?? "?"}${p.role !== "delegate" ? ` (${p.role})` : ""}`, committee_id: "" }));
  const recentLabels = Array.from(new Set((labels ?? []).map((l) => l.committee_label).filter((v): v is string => Boolean(v)))).slice(0, 12);
  return { committees: committees ?? [], sessions: sessions ?? [], members: viewer.isStaff ? all : members, recentLabels };
}
