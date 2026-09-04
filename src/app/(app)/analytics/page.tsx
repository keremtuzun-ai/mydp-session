import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { StatTile } from "@/components/mun/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceByWeekChart, TaskStatusChart } from "./charts";
import { humanize, fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

function isPastDue(due: string | null) {
  return due ? new Date(due).getTime() < Date.now() : false;
}

export default async function AnalyticsPage() {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Analytics are available to executives and admins." />;
  const supabase = await createClient();

  const [{ data: sessions }, { data: attendance }, { data: tasks }, { data: profiles }] = await Promise.all([
    supabase.from("weekly_sessions").select("id, title, starts_at, status").eq("status", "completed").order("starts_at"),
    supabase.from("attendance_records").select("session_id, profile_id, status"),
    supabase.from("tasks").select("id, status, due_at, assigned_committee_id"),
    supabase.from("profiles").select("id, role, onboarding_completed_at"),
  ]);

  const sessionList = sessions ?? [];
  const att = attendance ?? [];
  const attended = (s: string) => s === "present" || s === "late";

  // Attendance by week
  const byWeek = sessionList.map((s) => {
    const rows = att.filter((a) => a.session_id === s.id);
    const yes = rows.filter((a) => attended(a.status)).length;
    return { week: fmt(s.starts_at, "d MMM"), title: s.title, rate: rows.length ? Math.round((yes / rows.length) * 100) : 0, present: yes, total: rows.length };
  });


  // Tasks
  const taskList = tasks ?? [];
  const completed = taskList.filter((t) => t.status === "completed").length;
  const completionRate = taskList.length ? Math.round((completed / taskList.length) * 100) : 0;
  const overdue = taskList.filter((t) => t.status === "overdue" || (isPastDue(t.due_at) && ["not_started", "in_progress"].includes(t.status))).length;
  const awaitingReview = taskList.filter((t) => t.status === "submitted").length;
  const statusCounts = ["not_started", "in_progress", "submitted", "reviewed", "completed", "overdue"].map((s) => ({ status: humanize(s), count: taskList.filter((t) => t.status === s).length }));

  // Active members: attended at least one of the last 4 completed sessions
  const recent = sessionList.slice(-4).map((s) => s.id);
  const activeIds = new Set(att.filter((a) => recent.includes(a.session_id) && attended(a.status)).map((a) => a.profile_id));
  const onboarded = (profiles ?? []).filter((p) => p.onboarding_completed_at).length;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader eyebrow="Secretariat" title="Analytics" description="Attendance, task flow and engagement across the programme." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Attendance" value={byWeek.length ? `${Math.round(byWeek.reduce((a, b) => a + b.rate, 0) / byWeek.length)}%` : "—"} hint="average over completed sessions" />
        <StatTile label="Task completion" value={`${completionRate}%`} hint={`${completed} of ${taskList.length} tasks`} />
        <StatTile label="Overdue" value={overdue} hint="open tasks past due" />
        <StatTile label="Active members" value={activeIds.size} hint={`of ${onboarded} onboarded`} />
        <StatTile label="Awaiting review" value={awaitingReview} hint="submitted, not yet reviewed" />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance by week</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceByWeekChart data={byWeek} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-right">Attended</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byWeek.map((w) => (
                  <TableRow key={w.title + w.week}>
                    <TableCell>
                      {w.title} <span className="muted">· {w.week}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {w.present}/{w.total}
                    </TableCell>
                    <TableCell className="text-right font-medium">{w.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks by status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <TaskStatusChart data={statusCounts} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusCounts.map((s) => (
                <TableRow key={s.status}>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="text-right font-medium">{s.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
