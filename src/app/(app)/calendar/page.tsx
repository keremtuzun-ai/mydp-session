import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf, getUploadCounts } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { Button } from "@/components/ui/button";
import { TaskList } from "./task-list";

export const metadata: Metadata = { title: "My tasks" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const scope = sp.scope === "managed" ? "managed" : sp.scope === "all" ? "all" : "mine";

  const viewer = await getViewer();
  const supabase = await createClient();
  // Flag overdue work before listing. Idempotent and cheap.
  await supabase.rpc("mark_overdue_tasks");

  const { data: tasks } = await supabase.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).order("priority", { ascending: false });
  const all = tasks ?? [];
  const canManageAny = viewer.isStaff || viewer.isChair;

  const isMine = (t: (typeof all)[number]) =>
    t.assigned_to_profile_id === viewer.userId ||
    (t.assigned_to_profile_id === null && t.assigned_role === viewer.role) ||
    (t.assigned_to_profile_id === null && t.assigned_role === null && viewer.memberCommitteeIds.includes(t.assigned_committee_id ?? ""));
  const isManaged = (t: (typeof all)[number]) => viewer.isStaff || viewer.chairedCommitteeIds.includes(t.assigned_committee_id ?? "") || t.created_by === viewer.userId;

  const scoped = scope === "mine" ? all.filter(isMine) : scope === "managed" ? all.filter((t) => isManaged(t) && !isMine(t)) : all;
  const filtered = status ? scoped.filter((t) => t.status === status) : scoped;

  const [names, uploadCounts, { data: sessions }, { data: committees }] = await Promise.all([
    getNameMap(supabase, [...filtered.map((t) => t.created_by), ...filtered.map((t) => t.assigned_to_profile_id)]),
    getUploadCounts(supabase, filtered.map((t) => t.id)),
    supabase.from("weekly_sessions").select("id, title, starts_at"),
    supabase.from("committees").select("id, acronym"),
  ]);
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s]));
  const committeeMap = new Map((committees ?? []).map((c) => [c.id, c.acronym]));

  const rows = filtered.map((t) => ({
    ...t,
    assignedByName: nameOf(names, t.created_by),
    assigneeName: t.assigned_to_profile_id ? nameOf(names, t.assigned_to_profile_id) : t.assigned_role ? `All ${t.assigned_role}s` : "Committee-wide",
    sessionTitle: t.session_id ? sessionMap.get(t.session_id)?.title ?? null : null,
    committeeAcronym: t.assigned_committee_id ? committeeMap.get(t.assigned_committee_id) ?? null : null,
    uploadCount: uploadCounts.get(t.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title={scope === "mine" ? "My tasks" : scope === "managed" ? "Tasks I manage" : "All tasks"}
        description="Position papers, speeches and research briefs, with due dates and review status."
        actions={
          canManageAny ? (
            <Button asChild>
              <Link href="/calendar/new">
                <Plus className="size-4" aria-hidden /> Assign task
              </Link>
            </Button>
          ) : null
        }
      />
      <TaskList rows={rows} scope={scope} status={status} showScope={canManageAny} />
      {rows.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks here" description={status ? "Nothing matches this status." : "You are all caught up."} className="mt-4" />
      ) : null}
    </div>
  );
}
