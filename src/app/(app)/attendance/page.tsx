import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { AttendanceBadge } from "@/components/mun/session-status-badge";
import { StatTile } from "@/components/mun/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("attendance_records").select("*").eq("profile_id", viewer.userId).order("attended_on", { ascending: false });
  const list = data ?? [];
  const attended = list.filter((r) => r.status === "present" || r.status === "late").length;
  const rate = list.length ? Math.round((attended / list.length) * 100) : null;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader eyebrow="Records" title="Attendance" />
      <section className="card">
        <div className="section-head"><h2>Your attendance</h2></div>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <StatTile label="Rate" value={rate === null ? "—" : `${rate}%`} />
          <StatTile label="Days recorded" value={list.length} />
          <StatTile label="Absences" value={list.filter((r) => r.status === "absent").length} />
        </div>
        {list.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{fmt(`${r.attended_on}T12:00:00Z`, "EEEE d MMMM yyyy")}</TableCell>
                  <TableCell><AttendanceBadge status={r.status} /></TableCell>
                  <TableCell className="muted">{r.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No attendance recorded yet" className="empty-state-sm" />
        )}
      </section>
      {viewer.isStaff ? (
        <p className="m-0 small muted"><Link href="/exec/attendance" className="prose-link">Take attendance</Link></p>
      ) : null}
    </div>
  );
}
