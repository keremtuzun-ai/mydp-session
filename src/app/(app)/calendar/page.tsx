import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { TaskTable, type TaskRow } from "./task-table";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const scope = sp.scope === "managed" ? "managed" : sp.scope === "mine" ? "mine" : "all";

  const viewer = await getViewer();
  const supabase = await createClient();
  await supabase.rpc("mark_overdue_tasks");

  const { data: tasks } = await supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false });
  const all = tasks ?? [];
  const canManageAny = viewer.isStaff || viewer.isChair;

  const isMine = (t: (typeof all)[number]) =>
    t.assigned_to_profile_id === viewer.userId ||
    (t.assigned_to_profile_id === null && t.assigned_role === viewer.role) ||
    (t.assigned_to_profile_id === null && t.assigned_role === null && viewer.memberCommitteeIds.includes(t.assigned_committee_id ?? ""));
  const isManaged = (t: (typeof all)[number]) => viewer.isStaff || viewer.chairedCommitteeIds.includes(t.assigned_committee_id ?? "") || t.created_by === viewer.userId;

  const scoped = scope === "mine" ? all.filter(isMine) : scope === "managed" ? all.filter((t) => isManaged(t) && !isMine(t)) : all;
  const filtered = status ? scoped.filter((t) => t.status === status) : scoped;
  const ids = filtered.map((t) => t.id);

  const [{ data: uploads }, { data: sessions }, { data: committees }] = await Promise.all([
    ids.length ? supabase.from("task_uploads").select("*").in("task_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("weekly_sessions").select("id, title"),
    supabase.from("committees").select("id, acronym"),
  ]);
  const names = await getNameMap(supabase, [
    ...filtered.map((t) => t.created_by),
    ...filtered.map((t) => t.assigned_to_profile_id),
    ...(uploads ?? []).map((u) => u.uploaded_by),
  ]);
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.title]));
  const committeeMap = new Map((committees ?? []).map((c) => [c.id, c.acronym]));

  const rows: TaskRow[] = filtered.map((t) => ({
    ...t,
    assignedByName: t.author_name ?? nameOf(names, t.created_by),
    assigneeName: t.assigned_to_profile_id ? nameOf(names, t.assigned_to_profile_id) : t.assigned_role ? `All ${t.assigned_role}s` : "Committee-wide",
    sessionTitle: t.session_id ? sessionMap.get(t.session_id) ?? null : null,
    committeeAcronym: t.committee_label ?? (t.assigned_committee_id ? committeeMap.get(t.assigned_committee_id) ?? null : null),
    uploads: (uploads ?? [])
      .filter((u) => u.task_id === t.id)
      .map((u) => ({ id: u.id, title: u.title, file_name: u.file_name, external_url: u.external_url, created_at: u.created_at, authorName: nameOf(names, u.uploaded_by) })),
    canManage: isManaged(t),
    isAssignee: t.assigned_to_profile_id === viewer.userId,
  }));

  const scopeTitle = scope === "mine" ? "Your tasks" : scope === "managed" ? "Tasks you manage" : "All tasks";

  return (
    <>
      <PageHeader
        title="Calendar"
        description={canManageAny ? "Tasks assigned to you and to the committees you run." : "Tasks assigned to you and your committee. Ask your chair if something's missing."}
        actions={
          canManageAny ? (
            <Link href="/calendar/new" className="btn">
              Assign task
            </Link>
          ) : null
        }
      />
      <section className="card">
        <div className="section-head">
          <h2>{scopeTitle}</h2>
          <span className="tab-count">{rows.length}</span>
        </div>
        <TaskTable rows={rows} scope={scope} status={status} showScope={canManageAny} />
      </section>
    </>
  );
}
