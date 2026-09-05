import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listSessionsWithCoverage, getUploadCounts, getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionCard } from "@/components/mun/session-card";
import { EmptyState } from "@/components/mun/empty-state";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { StatTile } from "@/components/mun/stat-tile";
import { FormSuccess } from "@/components/ui/field";
import { relativeDue, formatDate, fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [upcoming, { data: tasks }, { data: announcements }, { data: attendance }, { data: sessionsDone }] = await Promise.all([
    listSessionsWithCoverage(supabase, { from: now, order: "asc", limit: 1 }),
    supabase.from("tasks").select("*").not("status", "in", "(completed,reviewed)").order("created_at", { ascending: false }).limit(8),
    supabase.from("announcements").select("*").lte("published_at", now).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(5),
    supabase.from("attendance_records").select("status, session_id").eq("profile_id", viewer.userId),
    supabase.from("weekly_sessions").select("id").eq("status", "completed"),
  ]);

  const nextSession = upcoming.find((s) => s.status === "published") ?? upcoming[0];
  const taskList = tasks ?? [];
  const uploadCounts = await getUploadCounts(supabase, taskList.map((t) => t.id));
  const names = await getNameMap(supabase, [...taskList.map((t) => t.created_by), ...(announcements ?? []).map((a) => a.author_id)]);

  const attended = (attendance ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const recorded = (attendance ?? []).length;
  const held = (sessionsDone ?? []).length;
  const rate = recorded ? Math.round((attended / recorded) * 100) : null;

  const firstName = viewer.profile.display_name?.split(" ")[0] ?? viewer.profile.username;

  return (
    <>
      <PageHeader
        eyebrow={fmt(new Date(), "EEEE, d MMMM yyyy")}
        title={`Good to see you, ${firstName}.`}
        actions={
          <>
            {viewer.isStaff ? (
              <Link href="/sessions/new" className="btn">
                New session
              </Link>
            ) : null}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Attendance" value={rate === null ? "—" : `${rate}%`} hint={recorded ? `${attended} of ${recorded} recorded` : `${held} session${held === 1 ? "" : "s"} held`} />
        <StatTile label="Open tasks" value={taskList.length} />
        <StatTile label="Sessions held" value={held} />
        <StatTile label="Notices" value={(announcements ?? []).length} />
      </div>

      <div className="two-col-wide grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mt-5">
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

        <section className="card">
          <div className="section-head">
            <h2>{viewer.isStaff ? "Executive desk" : "Quick links"}</h2>
          </div>
          <div className="filter-pills">
            {[
              ...(viewer.isStaff ? [["/exec", "Tasks & progress"], ["/exec/uploads", "Submissions"], ["/exec/attendance", "Attendance"], ["/calendar/new", "Assign task"]] : []),
              ["/calendar", "Calendar"],
              ["/sessions", "Sessions"],
              ["/materials", "Materials"],
              ["/announcements", "Announcements"],
              ["/attendance", "My attendance"],
              ["/settings", "Profile"],
              ...(viewer.isStaff ? [["/analytics", "Analytics"]] : []),
            ].map(([href, label]) => (
              <Link key={href} href={href!} className="filter-pill">
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="two-col-wide grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mt-5">
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

        <section className="card">
          <div className="section-head">
            <h2>Announcements</h2>
            <Link href="/announcements" className="section-tail prose-link">
              All notices
            </Link>
          </div>
          {announcements && announcements.length ? (
            <ul className="ledger">
              {announcements.map((a) => (
                <li key={a.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong>{a.title}</strong>
                    {a.pinned ? <span className="chip chip-red">Pinned</span> : null}
                  </div>
                  <p className="m-0 mt-1 small muted line-clamp-3">{a.body}</p>
                  <div className="dateline mt-2">
                    {a.author_name ?? nameOf(names, a.author_id, "Secretariat")} · {formatDate(a.published_at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No announcements" className="empty-state-sm" />
          )}
        </section>
      </div>
    </>
  );
}
