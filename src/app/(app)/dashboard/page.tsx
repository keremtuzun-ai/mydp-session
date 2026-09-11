import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ensureUpcomingSessions } from "@/lib/data/rolling-sessions";
import { listSessionsWithCoverage, getUploadCounts, getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionCard } from "@/components/mun/session-card";
import { EmptyState } from "@/components/mun/empty-state";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { StatTile } from "@/components/mun/stat-tile";
import { FormSuccess } from "@/components/ui/field";
import { relativeDue, fmt } from "@/lib/utils";
import { LiveVoting } from "./live-voting";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const now = new Date().toISOString();
  await ensureUpcomingSessions();

  const [upcoming, { data: tasks }, { data: attendance }] = await Promise.all([
    listSessionsWithCoverage(supabase, { from: now, order: "asc", limit: 1 }),
    supabase.from("tasks").select("*").not("status", "in", "(completed,reviewed)").order("created_at", { ascending: false }).limit(8),
    supabase.from("attendance_records").select("status, attended_on").eq("profile_id", viewer.userId),
  ]);

  const nextSession = upcoming.find((s) => s.status === "published") ?? upcoming[0];
  const taskList = tasks ?? [];
  const uploadCounts = await getUploadCounts(supabase, taskList.map((t) => t.id));
  const names = await getNameMap(supabase, taskList.map((t) => t.created_by));

  const attended = (attendance ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const recorded = (attendance ?? []).length;
  const rate = recorded ? Math.round((attended / recorded) * 100) : null;

  const firstName = viewer.profile.display_name?.split(" ")[0] ?? viewer.profile.username;

  return (
    <>
      <PageHeader
        eyebrow={fmt(new Date(), "EEEE, d MMMM yyyy")}
        title={`Good to see you, ${firstName}.`}
        actions={
          <>
            {viewer.isStaff || viewer.isChair ? (
              <Link href="/calendar/new" className="btn btn-outline">
                Assign task
              </Link>
            ) : null}
          </>
        }
      />
      {sp.welcome === "1" ? <FormSuccess message="Your profile is complete. Welcome to the programme." /> : null}
      {sp.denied === "1" ? <div role="alert" className="flash flash-warning">That page is reserved for another role.</div> : null}

      <div className="mb-5">
        <LiveVoting db={supabase} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Attendance" value={rate === null ? "—" : `${rate}%`} hint={recorded ? `${attended} of ${recorded} recorded` : undefined} />
        <StatTile label="Open tasks" value={taskList.length} />
      </div>

      <div className="mt-5">
        <section className="card">
          <div className="section-head">
            <h2>Next weekly session</h2>
            <Link href="/sessions" className="section-tail prose-link">
              All sessions
            </Link>
          </div>
          {nextSession ? (
            <>
              <SessionCard session={nextSession} highlight agendaPreview={nextSession.general_agenda} />
            </>
          ) : (
            <EmptyState title="No session scheduled" className="empty-state-sm" />
          )}
        </section>

      </div>

      <div className="mt-5">
        <section className="card">
          <div className="section-head">
            <h2>Latest tasks</h2>
            <span className="tab-count">{taskList.length}</span>
            <Link href="/calendar" className="section-tail prose-link">
              Open calendar
            </Link>
          </div>
          {taskList.length ? (
            <div className="table-scroll">
              <table className="data-table stack">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Due</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taskList.map((t) => (
                    <tr key={t.id}>
                      <td data-label="Task">
                        <Link href={`/calendar/${t.id}`} className="row-title">
                          {t.title}
                        </Link>
                        <div className="row-sub">
                          assigned by {t.author_name ?? nameOf(names, t.created_by)}
                          {uploadCounts.get(t.id) ? ` · ${uploadCounts.get(t.id)} upload${uploadCounts.get(t.id) === 1 ? "" : "s"}` : ""}
                        </div>
                      </td>
                      <td data-label="Due" className="whitespace-nowrap">{relativeDue(t.due_at)}</td>
                      <td data-label="Priority">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td data-label="Status">
                        <TaskStatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No open tasks" className="empty-state-sm" />
          )}
        </section>
      </div>
    </>
  );
}
