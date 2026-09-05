import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { StatTile } from "@/components/mun/stat-tile";
import { TaskTable, type TaskRow } from "../calendar/task-table";
import { TASK_STATUS_LABEL } from "@/components/mun/task-status-badge";
import { Progress } from "@/components/ui/progress";
import { getExecInviteToken, siteUrl } from "@/lib/env";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Executive desk" };

export default async function ExecPage({ searchParams }: PageProps<"/exec">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const viewer = await getViewer();
  const supabase = await createClient();
  await supabase.rpc("mark_overdue_tasks");

  const [{ data: tasks }, { data: uploads }, { data: sessions }, { data: people }, { data: allowlist }] = await Promise.all([
    supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("task_uploads").select("*").order("created_at", { ascending: false }),
    supabase.from("weekly_sessions").select("id, title"),
    supabase.from("public_profiles").select("id, display_name, username, role"),
    supabase.from("exec_allowlist").select("email, note, created_at").order("created_at", { ascending: true }),
  ]);
  const inviteToken = viewer.isAdmin ? getExecInviteToken() : "";
  const inviteUrl = inviteToken ? `${siteUrl.replace(/\/$/, "")}/exec-invite/${inviteToken}` : null;
  const all = tasks ?? [];
  const names = await getNameMap(supabase, [...all.map((t) => t.created_by), ...all.map((t) => t.assigned_to_profile_id), ...(uploads ?? []).map((u) => u.uploaded_by)]);
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.title]));

  const counts = Object.fromEntries(Object.keys(TASK_STATUS_LABEL).map((k) => [k, all.filter((t) => t.status === k).length])) as Record<string, number>;
  const done = counts.completed ?? 0;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const delegates = (people ?? []).filter((p) => p.role === "delegate");
  const submitted = counts.submitted ?? 0;

  const filtered = status ? all.filter((t) => t.status === status) : all;
  const rows: TaskRow[] = filtered.map((t) => ({
    ...t,
    assignedByName: nameOf(names, t.created_by),
    assigneeName: t.assigned_to_profile_id ? nameOf(names, t.assigned_to_profile_id) : "Everyone",
    sessionTitle: t.session_id ? sessionMap.get(t.session_id) ?? null : null,
    committeeAcronym: t.committee_label,
    uploads: (uploads ?? []).filter((u) => u.task_id === t.id).map((u) => ({ id: u.id, title: u.title, file_name: u.file_name, external_url: u.external_url, created_at: u.created_at, authorName: nameOf(names, u.uploaded_by) })),
    canManage: true,
    isAssignee: t.assigned_to_profile_id === viewer.userId,
  }));

  // Per-delegate progress
  const perDelegate = delegates.map((d) => {
    const mine = all.filter((t) => t.assigned_to_profile_id === d.id);
    const doneMine = mine.filter((t) => t.status === "completed").length;
    return { id: d.id, name: d.display_name ?? d.username ?? "?", total: mine.length, done: doneMine, open: mine.filter((t) => ["not_started", "in_progress", "overdue"].includes(t.status)).length, waiting: mine.filter((t) => t.status === "submitted").length };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Completion" value={`${pct}%`} hint={`${done} of ${all.length} tasks done`} />
        <StatTile label="Awaiting review" value={submitted} hint="submitted by delegates" />
        <StatTile label="Overdue" value={counts.overdue ?? 0} hint="past due, still open" />
        <StatTile label="Delegates" value={delegates.length} hint="registered" />
      </div>

      <section className="card">
        <div className="section-head">
          <h2>All tasks</h2>
          <span className="tab-count">{all.length}</span>
          <Link href="/calendar/new" className="section-tail btn btn-sm">
            Assign task
          </Link>
        </div>
        <TaskTable rows={rows} scope="all" status={status} showScope={false} basePath="/exec" />
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Progress by delegate</h2>
          <span className="tab-count">{delegates.length}</span>
        </div>
        {perDelegate.length ? (
          <div className="table-scroll">
            <table className="data-table stack">
              <thead>
                <tr>
                  <th>Delegate</th>
                  <th>Assigned</th>
                  <th>Done</th>
                  <th>Awaiting review</th>
                  <th>Open</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {perDelegate.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Delegate" className="font-[650]">{d.name}</td>
                    <td data-label="Assigned" className="num">{d.total}</td>
                    <td data-label="Done" className="num">{d.done}</td>
                    <td data-label="Awaiting review" className="num">{d.waiting}</td>
                    <td data-label="Open" className="num">{d.open}</td>
                    <td data-label="Progress" className="min-w-40">
                      <Progress value={d.total ? (d.done / d.total) * 100 : 0} label={`${d.name} progress`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 small muted">No delegates registered yet.</p>
        )}
      </section>

      {viewer.isAdmin ? (
        <section className="card">
          <div className="section-head">
            <h2>Executive access</h2>
            <span className="tab-count">{(allowlist ?? []).length}</span>
          </div>
          {inviteUrl ? (
            <p className="small muted mt-0">
              Share this secret link with new executives. Whoever opens it and enters their school email is added below and becomes an executive when they sign in or create their account. Rotate <code className="mono">EXEC_INVITE_TOKEN</code> to revoke it.
              <br />
              <code className="mono break-all">{inviteUrl}</code>
            </p>
          ) : (
            <p className="small muted mt-0">The invite link is disabled: set EXEC_INVITE_TOKEN to enable it.</p>
          )}
          {(allowlist ?? []).length ? (
            <div className="table-scroll">
              <table className="data-table stack">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Added</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(allowlist ?? []).map((a) => (
                    <tr key={a.email}>
                      <td data-label="Email" className="mono">{a.email}</td>
                      <td data-label="Added">{fmt(a.created_at, "d MMM yyyy")}</td>
                      <td data-label="Note" className="muted">{a.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="m-0 small muted">Nobody is on the executive list yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
