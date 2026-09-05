import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toActor } from "@/lib/auth/actor";
import { canManageTask } from "@/lib/policy";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { UploadList } from "@/components/mun/upload-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, relativeDue, humanize } from "@/lib/utils";
import { TaskStatusControls, DeleteUploadButton, DeleteTaskButton } from "./task-controls";
import { UploadDialog } from "@/components/mun/upload-dialog";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: PageProps<"/calendar/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const actor = toActor(viewer);
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();

  const [{ data: uploads }, { data: activity }, { data: session }, { data: committee }, { data: completions }] = await Promise.all([
    supabase.from("task_uploads").select("*").eq("task_id", id).order("created_at", { ascending: false }),
    supabase.from("task_activity").select("*").eq("task_id", id).order("created_at", { ascending: false }),
    task.session_id ? supabase.from("weekly_sessions").select("id, title, starts_at").eq("id", task.session_id).maybeSingle() : Promise.resolve({ data: null }),
    task.assigned_committee_id ? supabase.from("committees").select("id, acronym, name, slug").eq("id", task.assigned_committee_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("task_completions").select("profile_id, completed_at").eq("task_id", id),
  ]);
  const doneBy = completions ?? [];
  const doneByMe = doneBy.some((c) => c.profile_id === viewer.userId);
  const names = await getNameMap(supabase, [
    task.created_by,
    task.assigned_to_profile_id,
    task.reviewed_by,
    ...(uploads ?? []).map((u) => u.uploaded_by),
    ...(activity ?? []).map((a) => a.actor_id),
    ...doneBy.map((c) => c.profile_id),
  ]);
  const manager = canManageTask(actor, task);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow={task.committee_label ? `${task.committee_label} · task` : committee ? `${committee.acronym} · task` : "Task"}
        title={task.title}
        actions={
          <>
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
            {manager ? (
              <>
                <Link href={`/calendar/${task.id}/edit`} className="btn btn-outline btn-sm">
                  <Pencil aria-hidden /> Edit
                </Link>
                <DeleteTaskButton taskId={task.id} />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Brief</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {task.description ? <p className="m-0 whitespace-pre-wrap text-[0.92rem]">{task.description}</p> : <p className="m-0 small muted">No further instructions.</p>}
            <dl className="grid gap-3 text-[0.9rem] sm:grid-cols-2 m-0">
              <div>
                <dt className="label-caps">Assigned to</dt>
                <dd>{task.assigned_to_profile_id ? nameOf(names, task.assigned_to_profile_id) : task.assigned_role ? `All ${task.assigned_role}s` : "Everyone in committee"}</dd>
              </div>
              <div>
                <dt className="label-caps">Assigned by</dt>
                <dd>{task.author_name ?? nameOf(names, task.created_by)}</dd>
              </div>
              <div>
                <dt className="label-caps">Marked done by</dt>
                <dd>{doneBy.length ? doneBy.map((c) => nameOf(names, c.profile_id)).join(", ") : "Nobody yet"}</dd>
              </div>
              <div>
                <dt className="label-caps">Due</dt>
                <dd>
                  {relativeDue(task.due_at)} <span className="muted">({formatDateTime(task.due_at)})</span>
                </dd>
              </div>
              <div>
                <dt className="label-caps">Session</dt>
                <dd>{session ? <Link href={`/sessions/${session.id}`} className="prose-link">{session.title}</Link> : "—"}</dd>
              </div>
              <div>
                <dt className="label-caps">Committee / clause</dt>
                <dd>{task.committee_label ?? committee?.name ?? "—"}</dd>
              </div>
              {task.reviewed_by ? (
                <div>
                  <dt className="label-caps">Reviewed by</dt>
                  <dd>
                    {nameOf(names, task.reviewed_by)} · {formatDateTime(task.reviewed_at)}
                  </dd>
                </div>
              ) : null}
            </dl>
            {task.review_note ? (
              <div className="flash flash-navy">
                <span className="section-label">Chair&apos;s note</span>
                <p className="m-0 whitespace-pre-wrap">{task.review_note}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskStatusControls taskId={task.id} status={task.status} manager={manager} doneByMe={doneByMe} />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="evidence">
        <div className="section-head">
          <h2 id="evidence">Uploads</h2>
          <span className="tab-count">{(uploads ?? []).length}</span>
          <div className="section-tail">
            <UploadDialog taskId={task.id} />
          </div>
        </div>
        <div>
          <div>
            <UploadList
              items={(uploads ?? []).map((u) => ({
                id: u.id,
                title: u.title,
                notes: u.notes, delegation: u.delegation,
                file_name: u.file_name,
                mime_type: u.mime_type,
                size_bytes: u.size_bytes,
                external_url: u.external_url,
                created_at: u.created_at,
                authorName: nameOf(names, u.uploaded_by),
                downloadHref: u.external_url && !u.storage_path ? u.external_url : `/api/files/task-uploads/${u.id}`,
              }))}
              emptyTitle="No evidence uploaded"
              emptyDescription="Use Upload to paste a link or add a file."
            >
              {(item) => ((uploads ?? []).find((u) => u.id === item.id)?.uploaded_by === viewer.userId || manager ? <DeleteUploadButton id={item.id} /> : null)}
            </UploadList>
          </div>
        </div>
      </section>

      <section aria-labelledby="activity">
        <div className="section-head"><h2 id="activity">Activity</h2></div>
        {activity && activity.length ? (
          <ol className="ledger">
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
                <li key={a.id} className="text-[0.92rem]">
                  <span className="font-[650]">{nameOf(names, a.actor_id, "System")}</span> {text}
                  <p className="m-0 mt-1 dateline !flex">{formatDateTime(a.created_at)}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="m-0 small muted">No activity yet.</p>
        )}
      </section>
    </div>
  );
}
