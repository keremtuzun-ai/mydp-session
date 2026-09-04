"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/forms/action-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { setSessionStatus, deleteSession, updateSessionCommittee } from "@/actions/sessions";
import { addSessionFeedback } from "@/actions/feedback";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { Enums } from "@/lib/types/database";

export function SessionStatusControls({ sessionId, status }: { sessionId: string; status: Enums<"session_status"> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "completed" ? (
        <ActionButton size="sm" variant="outline" action={() => setSessionStatus(sessionId, "completed")}>
          <CheckCircle2 className="size-4" aria-hidden /> Mark completed
        </ActionButton>
      ) : (
        <ActionButton size="sm" variant="outline" action={() => setSessionStatus(sessionId, "published")}>
          <RotateCcw className="size-4" aria-hidden /> Reopen
        </ActionButton>
      )}
      {status !== "cancelled" ? (
        <ActionButton
          size="sm"
          variant="outline"
          action={() => setSessionStatus(sessionId, "cancelled")}
          confirm={{ title: "Cancel this session?", description: "Members will see it as cancelled. You can reopen it later.", confirmLabel: "Cancel session" }}
        >
          <XCircle className="size-4" aria-hidden /> Cancel
        </ActionButton>
      ) : null}
      <ActionButton
        size="sm"
        variant="destructive"
        action={() => deleteSession(sessionId)}
        confirm={{ title: "Delete this session?", description: "Committee blocks, attendance and links to tasks will be removed. This cannot be undone.", confirmLabel: "Delete" }}
      >
        <Trash2 className="size-4" aria-hidden /> Delete
      </ActionButton>
    </div>
  );
}

export function CommitteeBlockEditor({ block, acronym }: { block: { id: string; topic: string | null; agenda: string | null; chair_notes: string | null }; acronym: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateSessionCommittee, null);
  useActionFeedback(state, () => setOpen(false));
  return (
    <div className="mt-3 space-y-2">
      {block.chair_notes ? (
        <div className="flash flash-navy">
          <span className="section-label">Chair notes (not visible to delegates)</span>
          <p className="m-0 whitespace-pre-wrap">{block.chair_notes}</p>
        </div>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Edit {acronym} block
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{acronym} agenda for this session</DialogTitle>
            <DialogDescription>Topic and agenda are visible to delegates. Chair notes stay with chairs and the Secretariat.</DialogDescription>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="session_committee_id" value={block.id} />
            <Field label="Topic" htmlFor={`topic-${block.id}`}>
              <Input id={`topic-${block.id}`} name="topic" defaultValue={block.topic ?? ""} />
            </Field>
            <Field label="Agenda" htmlFor={`agenda-${block.id}`}>
              <Textarea id={`agenda-${block.id}`} name="agenda" rows={4} defaultValue={block.agenda ?? ""} />
            </Field>
            <Field label="Chair notes" htmlFor={`notes-${block.id}`} hint="Private to chairs, executives and admins.">
              <Textarea id={`notes-${block.id}`} name="chair_notes" rows={3} defaultValue={block.chair_notes ?? ""} />
            </Field>
            <FormError message={state && !state.ok ? state.error : null} />
            <div className="flex justify-end">
              <SubmitButton>Save block</SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FeedbackForm({ sessionId, targets }: { sessionId: string; targets: { id: string; name: string }[] }) {
  const [state, action] = useActionState(addSessionFeedback, null);
  useActionFeedback(state);
  return (
    <Card className="card-tight">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="session_id" value={sessionId} />
        <span className="section-label">Write feedback for a delegate</span>
        <Field label="Delegate" htmlFor="fb-profile">
          <NativeSelect id="fb-profile" name="profile_id" required>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Feedback" htmlFor="fb-body">
          <Textarea id="fb-body" name="body" rows={3} required placeholder="What went well, and one thing to work on." />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <div className="flex justify-end">
          <SubmitButton size="sm">Send feedback</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
