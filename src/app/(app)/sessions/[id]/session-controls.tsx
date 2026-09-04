"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { setSessionStatus, deleteSession } from "@/actions/sessions";
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
