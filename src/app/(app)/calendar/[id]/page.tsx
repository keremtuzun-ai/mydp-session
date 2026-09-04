import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, History } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toActor } from "@/lib/auth/actor";
import { canManageTask, canUploadEvidence } from "@/lib/policy";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { UploadList } from "@/components/mun/upload-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime, relativeDue, humanize } from "@/lib/utils";
import { TaskStatusControls, EvidenceUploadForm, DeleteUploadButton, DeleteTaskButton } from "./task-controls";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: PageProps<"/calendar/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const actor = toActor(viewer);
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();

  const [{ data: uploads }, { data: activity }, { data: session }, { data: committee }] = await Promise.all([
    supabase.from("task_uploads").select("*").eq("task_id", id).order("created_at", { ascending: false }),
    supabase.from("task_activity").select("*").eq("task_id", id).order("created_at", { ascending: false }),
    task.session_id ? supabase.from("weekly_sessions").select("id, title, starts_at").eq("id", task.session_id).maybeSingle() : Promise.resolve({ data: null }),
    task.assigned_committee_id ? supabase.from("committees").select("id, acronym, name, slug").eq("id", task.assigned_committee_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const names = await getNameMap(supabase, [
    task.created_by,
    task.assigned_to_profile_id,
    task.reviewed_by,
    ...(uploads ?? []).map((u) => u.uploaded_by),
    ...(activity ?? []).map((a) => a.actor_id),
  ]);
  const manager = canManageTask(actor, task);
  const canUpload = canUploadEvidence(actor, task);
  const isAssignee = task.assigned_to_profile_id === viewer.userId;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={committee ? `${committee.acronym} · task` : "Task"}
        title={task.title}
        actions={
          <>
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            {manager ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/calendar/${task.id}/edit`}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </Link>
                </Button>
                <DeleteTaskButton taskId={task.id} />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description ? <p className="whitespace-pre-wrap text-sm">{task.description}</p> : <p className="text-sm text-muted-foreground">No further instructions.</p>}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="eyebrow">Assigned to</dt>
                <dd>{task.assigned_to_profile_id ? nameOf(names, task.assigned_to_profile_id) : task.assigned_role ? `All ${task.assigned_role}s` : "Everyone in committee"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Assigned by</dt>
                <dd>{nameOf(names, task.created_by)}</dd>
              </div>
              <div>
                <dt className="eyebrow">Due</dt>
                <dd>
                  {relativeDue(task.due_at)} <span className="text-muted-foreground">({formatDateTime(task.due_at)})</span>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Session</dt>
                <dd>{session ? <Link href={`/sessions/${session.id}`} className="underline-offset-4 hover:underline">{session.title}</Link> : "—"}</dd>
              </div>
              <div>
                <dt className="eyebrow">Committee</dt>
                <dd>{committee ? <Link href={`/committees/${committee.slug}`} className="underline-offset-4 hover:underline">{committee.name}</Link> : "—"}</dd>
              </div>
              {task.reviewed_by ? (
                <div>
                  <dt className="eyebrow">Reviewed by</dt>
                  <dd>
                    {nameOf(names, task.reviewed_by)} · {formatDateTime(task.reviewed_at)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {task.review_note ? (
              <div className="rounded-md border border-gold-deep/40 bg-gold/10 p-3 text-sm">
                <p className="eyebrow mb-1">Chair&apos;s note</p>
                <p className="whitespace-pre-wrap">{task.review_note}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskStatusControls taskId={task.id} status={task.status} manager={manager} isAssignee={isAssignee} />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="evidence">
        <h2 id="evidence" className="eyebrow mb-3">
          Evidence ({(uploads ?? []).length})
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UploadList
              items={(uploads ?? []).map((u) => ({
                id: u.id,
                title: u.title,
                notes: u.notes,
                file_name: u.file_name,
                mime_type: u.mime_type,
                size_bytes: u.size_bytes,
                created_at: u.created_at,
                authorName: nameOf(names, u.uploaded_by),
                downloadHref: `/api/files/task-uploads/${u.id}`,
              }))}
              emptyTitle="No evidence uploaded"
              emptyDescription={canUpload ? "Upload your work as PDF, PNG, JPG or DOCX." : undefined}
            >
              {(item) => ((uploads ?? []).find((u) => u.id === item.id)?.uploaded_by === viewer.userId || manager ? <DeleteUploadButton id={item.id} /> : null)}
            </UploadList>
          </div>
          {canUpload ? <EvidenceUploadForm taskId={task.id} /> : null}
        </div>
      </section>

      <section aria-labelledby="activity">
        <h2 id="activity" className="eyebrow mb-3 inline-flex items-center gap-2">
          <History className="size-3.5" aria-hidden /> Activity
        </h2>
        {activity && activity.length ? (
          <ol className="relative ml-2 space-y-4 border-l pl-5">
            {activity.map((a) => {
              const meta = (a.metadata ?? {}) as Record<string, unknown>;
              const text =
                a.action === "status_changed"
                  ? `changed status from ${humanize(String(meta.from ?? ""))} to ${humanize(String(meta.to ?? ""))}`
                  : a.action === "evidence_uploaded"
                    ? `uploaded “${String(meta.title ?? meta.file_name ?? "a file")}”`
                    : a.action === "evidence_removed"
                      ? `removed “${String(meta.title ?? "an upload")}”`
                      : a.action === "returned"
                        ? `returned the task${meta.note ? `: “${String(meta.note)}”` : ""}`
                        : a.action === "completed"
                          ? `marked the task completed${meta.note ? `: “${String(meta.note)}”` : ""}`
                          : a.action === "reopened"
                            ? "reopened the task"
                            : a.action === "created"
                              ? "created the task"
                              : humanize(a.action);
              return (
                <li key={a.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2 rounded-full bg-gold-deep" aria-hidden />
                  <span className="font-medium">{nameOf(names, a.actor_id, "System")}</span> {text}
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
