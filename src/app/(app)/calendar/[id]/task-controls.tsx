"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Undo2, CheckCheck, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { setTaskStatus, toggleTaskDone, deleteUpload, deleteTask } from "@/actions/tasks";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"task_status">;

export function TaskStatusControls({ taskId, status, manager, doneByMe }: { taskId: string; status: Status; manager: boolean; doneByMe: boolean }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const closed = status === "reviewed" || status === "completed";

  return (
    <div className="flex flex-col gap-3">
      {!manager ? (
        <div className="flex flex-wrap items-center gap-2">
          {doneByMe ? (
            <ActionButton size="sm" variant="outline" action={() => toggleTaskDone({ taskId, done: false })}>
              <Undo2 className="size-4" aria-hidden /> Mark not done
            </ActionButton>
          ) : (
            <ActionButton size="sm" action={() => toggleTaskDone({ taskId, done: true })}>
              <CheckCheck className="size-4" aria-hidden /> Mark done
            </ActionButton>
          )}
          {status === "reviewed" ? <span className="small muted">Returned by the desk.</span> : null}
        </div>
      ) : null}

      {manager ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <span className="section-label">Review</span>
          <div className="flex flex-wrap gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={status === "reviewed"}>
                  <Undo2 className="size-4" aria-hidden /> Return with note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Return this task</DialogTitle>
                  <DialogDescription>The delegate sees the note on the task and cannot edit status until you reopen it.</DialogDescription>
                </DialogHeader>
                <Field label="Note to delegate" htmlFor="return-note">
                  <Textarea id="return-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
                </Field>
                <DialogFooter>
                  <ActionButton action={() => setTaskStatus({ taskId, status: "reviewed", note })} onSuccess={() => setOpen(false)} disabled={note.trim().length < 2}>
                    Return task
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ActionButton size="sm" action={() => setTaskStatus({ taskId, status: "completed" })} disabled={status === "completed"}>
              <CheckCheck className="size-4" aria-hidden /> Mark completed
            </ActionButton>
            {closed || status === "overdue" ? (
              <ActionButton size="sm" variant="ghost" action={() => setTaskStatus({ taskId, status: "in_progress" })}>
                <RotateCcw className="size-4" aria-hidden /> Reopen
              </ActionButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DeleteUploadButton({ id }: { id: string }) {
  return (
    <ActionButton size="sm" variant="ghost" action={() => deleteUpload(id)} confirm={{ title: "Remove this upload?", description: "The file will be deleted from storage.", confirmLabel: "Remove" }}>
      <Trash2 className="size-4" aria-hidden />
      <span className="sr-only">Remove upload</span>
    </ActionButton>
  );
}

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  return (
    <ActionButton
      size="sm"
      variant="destructive"
      action={() => deleteTask(taskId)}
      onSuccess={() => router.push("/calendar")}
      confirm={{ title: "Delete this task?", description: "Uploads and the activity log go with it. This cannot be undone.", confirmLabel: "Delete task" }}
    >
      <Trash2 className="size-4" aria-hidden /> Delete
    </ActionButton>
  );
}
