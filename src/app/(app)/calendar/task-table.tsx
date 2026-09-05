"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition } from "react";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { EmptyState } from "@/components/mun/empty-state";
import { setTaskStatus, toggleTaskDone } from "@/actions/tasks";
import { UploadDialog } from "@/components/mun/upload-dialog";
import { formatDateTime, fmt } from "@/lib/utils";
import type { Task } from "@/lib/types/database";

export type TaskRow = Task & {
  assignedByName: string;
  assigneeName: string;
  sessionTitle: string | null;
  committeeAcronym: string | null;
  uploads: { id: string; title: string; file_name: string | null; external_url: string | null; created_at: string; authorName: string }[];
  canManage: boolean;
  isAssignee: boolean;
  doneByMe: boolean;
};

function dueText(due: string | null) {
  if (!due) return "—";
  const time = fmt(due, "HH:mm");
  return time === "00:00" ? fmt(due, "yyyy-MM-dd") : `${fmt(due, "yyyy-MM-dd")} · ${time}`;
}

function RowAction({ row }: { row: TaskRow }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (status: Task["status"]) =>
    start(async () => {
      const r = await setTaskStatus({ taskId: row.id, status });
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  const closed = row.status === "completed" || row.status === "reviewed";
  if (row.canManage) {
    return closed ? (
      <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run("in_progress")}>
        Reopen
      </button>
    ) : (
      <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run("completed")}>
        Mark done
      </button>
    );
  }
  const toggle = (done: boolean) =>
    start(async () => {
      const r = await toggleTaskDone({ taskId: row.id, done });
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  return row.doneByMe ? (
    <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => toggle(false)}>
      Mark not done
    </button>
  ) : (
    <button type="button" className="btn btn-sm" disabled={pending} onClick={() => toggle(true)}>
      Mark done
    </button>
  );
}

export function TaskTable({ rows }: { rows: TaskRow[]; scope?: string; status?: string; showScope?: boolean; basePath?: string }) {
  return (
    <>
      {rows.length === 0 ? (
        <EmptyState title="No tasks yet" />
      ) : (
        <div className="table-scroll">
          <table className="data-table stack">
            <thead>
              <tr>
                <th>Task</th>
                <th>Due</th>
                <th>Priority</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <Row key={t.id} row={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Row({ row: t }: { row: TaskRow }) {
  return (
    <>
      <tr>
        <td data-label="Task">
          <Link href={`/calendar/${t.id}`} className="row-title">
            {t.title}
          </Link>
          {t.description ? <div className="row-sub line-clamp-2">{t.description}</div> : null}
          <div className="row-sub faint">
            {t.assigneeName}
            {t.committeeAcronym ? ` · ${t.committeeAcronym}` : ""}
            {t.sessionTitle ? ` · ${t.sessionTitle}` : ""}
            {` · assigned by ${t.assignedByName}`}
          </div>
        </td>
        <td data-label="Due" className="mono whitespace-nowrap" title={formatDateTime(t.due_at)}>
          {dueText(t.due_at)}
        </td>
        <td data-label="Priority">
          <PriorityBadge priority={t.priority} />
        </td>
        <td data-label="Status">
          <TaskStatusBadge status={t.status} />
        </td>
        <td className="actions">
          <div className="flex flex-wrap justify-end gap-1">
            <UploadDialog taskId={t.id} size="sm" variant="outline" />
            <RowAction row={t} />
          </div>
        </td>
      </tr>
      <tr className="task-files-row">
        <td colSpan={5}>
          <details className="task-files">
            <summary>
              Uploads <span className="tab-count">{t.uploads.length}</span>
            </summary>
            {t.uploads.length ? (
              <ul className="task-file-list">
                {t.uploads.map((u) => (
                  <li key={u.id} className="task-file">
                    <div className="task-file-meta">
                      <a href={`/api/files/task-uploads/${u.id}`} target="_blank" rel="noopener noreferrer" className="prose-link">
                        <strong>{u.title}</strong>
                      </a>
                      <span className="muted small mono">{u.file_name ?? (u.external_url ? new URL(u.external_url).hostname : "")}</span>
                      <div className="muted small">
                        Submitted {fmt(u.created_at, "dd MMM HH:mm")} · {u.authorName}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small mt-2 mb-0">
                No uploads yet.{" "}
                <Link href={`/calendar/${t.id}`} className="prose-link">
                  Open the task
                </Link>{" "}
                to add evidence.
              </p>
            )}
          </details>
        </td>
      </tr>
    </>
  );
}
