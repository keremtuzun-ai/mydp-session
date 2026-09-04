import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { UploadList } from "@/components/mun/upload-list";
import { EmptyState } from "@/components/mun/empty-state";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";

export const metadata: Metadata = { title: "Submissions" };

export default async function ExecUploadsPage() {
  const supabase = await createClient();
  const [{ data: uploads }, { data: tasks }] = await Promise.all([
    supabase.from("task_uploads").select("*").order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, status, committee_label, assigned_to_profile_id"),
  ]);
  const list = uploads ?? [];
  const names = await getNameMap(supabase, list.map((u) => u.uploaded_by));
  const taskMap = new Map((tasks ?? []).map((t) => [t.id, t]));
  const byTask = Array.from(new Set(list.map((u) => u.task_id))).map((id) => ({ task: taskMap.get(id), items: list.filter((u) => u.task_id === id) }));

  return (
    <div className="flex flex-col gap-5">
      {byTask.length === 0 ? (
        <section className="card">
          <EmptyState title="No submissions yet" description="Files and document links delegates submit on their tasks appear here." className="empty-state-sm" />
        </section>
      ) : (
        byTask.map(({ task, items }) => (
          <section key={task?.id ?? items[0]!.task_id} className="card">
            <div className="section-head flex-wrap">
              <h2>
                {task ? (
                  <Link href={`/calendar/${task.id}`} className="row-title">
                    {task.title}
                  </Link>
                ) : (
                  "Task"
                )}
              </h2>
              {task?.committee_label ? <span className="chip chip-navy">{task.committee_label}</span> : null}
              {task ? <TaskStatusBadge status={task.status} /> : null}
              <span className="tab-count">{items.length}</span>
            </div>
            <UploadList
              items={items.map((u) => ({
                id: u.id,
                title: u.title,
                notes: u.notes,
                file_name: u.file_name,
                mime_type: u.mime_type,
                size_bytes: u.size_bytes,
                external_url: u.external_url,
                created_at: u.created_at,
                authorName: nameOf(names, u.uploaded_by),
                downloadHref: u.external_url && !u.storage_path ? u.external_url : `/api/files/task-uploads/${u.id}`,
              }))}
            />
          </section>
        ))
      )}
    </div>
  );
}
