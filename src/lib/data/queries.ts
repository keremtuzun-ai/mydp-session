import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PublicProfile, WeeklySession } from "@/lib/types/database";

export type Db = SupabaseClient<Database>;

export const SESSION_COMMITTEE_COLUMNS = "id, session_id, committee_id, topic, agenda, created_at" as const;

/** Resolve display names for a set of profile ids through the non-private view. */
export async function getNameMap(db: Db, ids: Iterable<string | null | undefined>) {
  const unique = Array.from(new Set(Array.from(ids).filter((v): v is string => Boolean(v))));
  const map = new Map<string, PublicProfile>();
  if (unique.length === 0) return map;
  const { data } = await db.from("public_profiles").select("*").in("id", unique);
  for (const p of data ?? []) map.set(p.id, p);
  return map;
}

export function nameOf(map: Map<string, PublicProfile>, id: string | null | undefined, fallback = "Unknown") {
  if (!id) return fallback;
  return map.get(id)?.display_name ?? map.get(id)?.username ?? fallback;
}

export type SessionWithCoverage = WeeklySession & {
  committees: { id: string; acronym: string; name: string; slug: string }[];
  attendance: { present: number; late: number; excused: number; absent: number; total: number };
};

/** Sessions with committee coverage + attendance counts (as visible to the viewer). */
export async function listSessionsWithCoverage(db: Db, opts: { from?: string; to?: string; order?: "asc" | "desc"; limit?: number } = {}) {
  let q = db.from("weekly_sessions").select("*").order("starts_at", { ascending: opts.order !== "desc" });
  if (opts.from) q = q.gte("starts_at", opts.from);
  if (opts.to) q = q.lt("starts_at", opts.to);
  if (opts.limit) q = q.limit(opts.limit);
  const { data: sessions } = await q;
  const list = sessions ?? [];
  if (list.length === 0) return [] as SessionWithCoverage[];
  const ids = list.map((s) => s.id);
  const [{ data: sc }, { data: att }] = await Promise.all([
    db.from("session_committees").select(`${SESSION_COMMITTEE_COLUMNS}, committees ( id, acronym, name, slug )`).in("session_id", ids),
    db.from("attendance_records").select("session_id, status").in("session_id", ids),
  ]);
  return list.map((s) => {
    const committees = (sc ?? [])
      .filter((r) => r.session_id === s.id)
      .map((r) => r.committees)
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const rows = (att ?? []).filter((a) => a.session_id === s.id);
    const count = (st: string) => rows.filter((a) => a.status === st).length;
    return {
      ...s,
      committees,
      attendance: { present: count("present"), late: count("late"), excused: count("excused"), absent: count("absent"), total: rows.length },
    };
  });
}

export function attendanceSummaryText(a: SessionWithCoverage["attendance"]) {
  if (a.total === 0) return "";
  const attended = a.present + a.late;
  return `${attended}/${a.total} attended`;
}

export async function getUploadCounts(db: Db, taskIds: string[]) {
  const counts = new Map<string, number>();
  if (taskIds.length === 0) return counts;
  const { data } = await db.from("task_uploads").select("task_id").in("task_id", taskIds);
  for (const row of data ?? []) counts.set(row.task_id, (counts.get(row.task_id) ?? 0) + 1);
  return counts;
}

export async function listCommitteesWithChairs(db: Db) {
  const [{ data: committees }, { data: memberships }] = await Promise.all([
    db.from("committees").select("*").order("name"),
    db.from("committee_memberships").select("committee_id, profile_id, membership_role"),
  ]);
  const chairIds = (memberships ?? []).filter((m) => m.membership_role === "chair" || m.membership_role === "co_chair").map((m) => m.profile_id);
  const names = await getNameMap(db, chairIds);
  return (committees ?? []).map((c) => {
    const mine = (memberships ?? []).filter((m) => m.committee_id === c.id);
    return {
      ...c,
      chairNames: mine
        .filter((m) => m.membership_role === "chair" || m.membership_role === "co_chair")
        .map((m) => nameOf(names, m.profile_id)),
      memberCount: mine.length,
    };
  });
}

/** Members of committees the viewer may see, deduplicated. Used for assignee pickers. */
export async function listAssignableMembers(db: Db, committeeIds: string[] | "all") {
  let q = db.from("committee_memberships").select("profile_id, committee_id, membership_role");
  if (committeeIds !== "all") {
    if (committeeIds.length === 0) return [] as { id: string; name: string; committee_id: string }[];
    q = q.in("committee_id", committeeIds);
  }
  const { data } = await q;
  const names = await getNameMap(db, (data ?? []).map((m) => m.profile_id));
  return (data ?? []).map((m) => ({ id: m.profile_id, name: nameOf(names, m.profile_id), committee_id: m.committee_id }));
}
