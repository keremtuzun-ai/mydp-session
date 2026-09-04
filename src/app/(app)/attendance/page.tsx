import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { AttendanceBadge } from "@/components/mun/session-status-badge";
import { StatTile } from "@/components/mun/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { RollCall, SessionPicker } from "./roll-call";
import type { Enums } from "@/lib/types/database";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: PageProps<"/attendance">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();

  // ── Personal history (everyone) ──
  const { data: myRecords } = await supabase.from("attendance_records").select("*").eq("profile_id", viewer.userId);
  const { data: sessions } = await supabase.from("weekly_sessions").select("id, title, starts_at, status").neq("status", "draft").order("starts_at", { ascending: false });
  const sessionList = sessions ?? [];
  const mine = new Map((myRecords ?? []).map((r) => [r.session_id, r]));
  const pastSessions = sessionList.filter((s) => s.status === "completed");
  const attended = pastSessions.filter((s) => ["present", "late"].includes(mine.get(s.id)?.status ?? "")).length;
  const recorded = pastSessions.filter((s) => mine.has(s.id)).length;
  const rate = recorded ? Math.round((attended / recorded) * 100) : null;

  const canRecord = viewer.isStaff || viewer.isChair;
  const selectedSessionId = typeof sp.session === "string" ? sp.session : sessionList.find((s) => s.status === "published")?.id ?? sessionList[0]?.id ?? "";

  // ── Roster for chairs / staff ──
  let roster: { committeeId: string; acronym: string; name: string; members: { profileId: string; name: string; delegation: string | null; status: Enums<"attendance_status"> | null; note: string | null }[] }[] = [];
  if (canRecord && selectedSessionId) {
    const scopeIds = viewer.isStaff ? null : viewer.chairedCommitteeIds;
    let q = supabase.from("committee_memberships").select("profile_id, committee_id, delegation, membership_role, committees ( id, acronym, name )");
    if (scopeIds) q = q.in("committee_id", scopeIds.length ? scopeIds : ["00000000-0000-0000-0000-000000000000"]);
    const [{ data: memberships }, { data: records }] = await Promise.all([q, supabase.from("attendance_records").select("*").eq("session_id", selectedSessionId)]);
    const recordMap = new Map((records ?? []).map((r) => [r.profile_id, r]));
    const names = await getNameMap(supabase, (memberships ?? []).map((m) => m.profile_id));
    const byCommittee = new Map<string, (typeof roster)[number]>();
    for (const m of memberships ?? []) {
      if (!m.committees) continue;
      const entry = byCommittee.get(m.committee_id) ?? { committeeId: m.committee_id, acronym: m.committees.acronym, name: m.committees.name, members: [] };
      entry.members.push({ profileId: m.profile_id, name: nameOf(names, m.profile_id), delegation: m.delegation, status: recordMap.get(m.profile_id)?.status ?? null, note: recordMap.get(m.profile_id)?.note ?? null });
      byCommittee.set(m.committee_id, entry);
    }
    roster = Array.from(byCommittee.values()).sort((a, b) => a.acronym.localeCompare(b.acronym));
    for (const r of roster) r.members.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Records"
        title="Attendance"
        description={canRecord ? "Your own history, and roll call for the committees you are responsible for." : "Your attendance across weekly sessions."}
      />

      <section aria-labelledby="my-attendance" className="card">
        <div className="section-head"><h2 id="my-attendance">Your attendance</h2></div>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <StatTile label="Rate" value={rate === null ? "—" : `${rate}%`} hint={recorded ? `${attended} of ${recorded} recorded sessions` : "No sessions recorded yet"} />
          <StatTile label="Sessions held" value={pastSessions.length} />
          <StatTile label="Absences" value={pastSessions.filter((s) => mine.get(s.id)?.status === "absent").length} />
        </div>
        {sessionList.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionList.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell className="muted">{formatDate(s.starts_at)}</TableCell>
                  <TableCell>
                    <AttendanceBadge status={mine.get(s.id)?.status} />
                  </TableCell>
                  <TableCell className="muted">{mine.get(s.id)?.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No sessions yet" className="empty-state-sm" />
        )}
      </section>

      {canRecord ? (
        <section aria-labelledby="roll-call" className="flex flex-col gap-4">
          <div className="section-head flex-wrap items-end">
            <h2 id="roll-call">Roll call</h2>
            <span className="tab-count">{viewer.isStaff ? "all committees" : "your committees"}</span>
            <div className="ml-auto"><SessionPicker sessions={sessionList} selected={selectedSessionId} /></div>
          </div>
          {roster.length ? (
            roster.map((c) => <RollCall key={c.committeeId} sessionId={selectedSessionId} committee={c} />)
          ) : (
            <EmptyState title="No members to record" description="You are not chairing a committee with members yet." className="empty-state-sm" />
          )}
        </section>
      ) : null}
    </div>
  );
}
