"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Undo2, CheckCheck, Send, RotateCcw, PlayCircle } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { setTaskStatus, uploadEvidence, deleteUpload, deleteTask } from "@/actions/tasks";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ACCEPT_ATTRIBUTE } from "@/lib/validation/files";
import { MAX_UPLOAD_BYTES } from "@/lib/env";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"task_status">;

export function TaskStatusControls({ taskId, status, manager, isAssignee }: { taskId: string; status: Status; manager: boolean; isAssignee: boolean }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const closed = status === "reviewed" || status === "completed";

  return (
    <div className="flex flex-col gap-3">
      {isAssignee && !closed ? (
        <div className="flex flex-wrap gap-2">
          {status !== "in_progress" ? (
            <ActionButton size="sm" variant="outline" action={() => setTaskStatus({ taskId, status: "in_progress" })}>
              <PlayCircle className="size-4" aria-hidden /> Start
            </ActionButton>
          ) : null}
          {status !== "submitted" ? (
            <ActionButton size="sm" action={() => setTaskStatus({ taskId, status: "submitted" })}>
              <Send className="size-4" aria-hidden /> Submit for review
            </ActionButton>
          ) : (
            <ActionButton size="sm" variant="outline" action={() => setTaskStatus({ taskId, status: "in_progress" })}>
              <Undo2 className="size-4" aria-hidden /> Withdraw submission
            </ActionButton>
          )}
        </div>
      ) : null}
      {isAssignee && closed && !manager ? <p className="m-0 small muted">This task has been {status === "completed" ? "completed" : "returned"} by your chair.</p> : null}
      {isAssignee && status === "reviewed" ? <p className="m-0 small muted">Ask an executive to reopen it to resubmit.</p> : null}

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

export function EvidenceUploadForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(uploadEvidence, null);
  useActionFeedback(state);
  return (
    <Card className="card-tight">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="task_id" value={taskId} />
        <span className="section-label m-0">Submit your work</span>
        <Field label="Title" htmlFor="up-title">
          <Input id="up-title" name="title" placeholder="Position paper (final)" required />
        </Field>
        <Field label="Notes" htmlFor="up-notes" optional>
          <Textarea id="up-notes" name="notes" rows={2} placeholder="Anything your chair should know." />
        </Field>
        <Field label="Google Doc or other link" htmlFor="up-url" optional hint="Share it as “Anyone with the link”.">
          <Input id="up-url" name="external_url" type="url" inputMode="url" placeholder="https://docs.google.com/document/d/…" />
        </Field>
        <Field label="File" htmlFor="up-file" optional hint={`PDF, PNG, JPG or DOCX up to ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB. Attach a file, a link, or both.`}>
          <Input id="up-file" name="file" type="file" accept={ACCEPT_ATTRIBUTE} />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <div className="flex justify-end">
          <SubmitButton size="sm" pendingText="Saving…">
            Submit
          </SubmitButton>
        </div>
      </form>
    </Card>
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
