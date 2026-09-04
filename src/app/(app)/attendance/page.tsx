import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { AttendanceBadge } from "@/components/mun/session-status-badge";
import { StatTile } from "@/components/mun/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
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

  const canRecord = viewer.isStaff;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Records"
        title="Attendance"
        description="Your attendance across weekly sessions."
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
        <p className="m-0 small muted">Taking attendance for everyone happens in the <Link href="/exec/attendance" className="prose-link">executive desk</Link>.</p>
      ) : null}
    </div>
  );
}
