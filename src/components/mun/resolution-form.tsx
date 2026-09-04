"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { addResolutionLink, deleteResolutionLink } from "@/actions/resolutions";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import { RESOLUTION_KINDS, RESOLUTION_KIND_LABEL } from "@/lib/validation/schemas";

export function ResolutionForm({ committees, defaultCommitteeId }: { committees: { id: string; acronym: string }[]; defaultCommitteeId?: string }) {
  const [state, action] = useActionState(addResolutionLink, null);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => formRef.current?.reset());
  return (
    <Card className="card-tight">
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <span className="section-label m-0">Share a document link</span>
        <p className="m-0 small muted">Paste the link to your Google Doc (set sharing to “Anyone with the link can view or comment”). Your committee, its chairs and the Secretariat can open it.</p>
        {committees.length > 1 ? (
          <Field label="Committee" htmlFor="rl-committee">
            <NativeSelect id="rl-committee" name="committee_id" defaultValue={defaultCommitteeId ?? committees[0]?.id}>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <input type="hidden" name="committee_id" value={defaultCommitteeId ?? committees[0]?.id ?? ""} />
        )}
        <Field label="Title" htmlFor="rl-title" error={fieldError(state, "title")}>
          <Input id="rl-title" name="title" placeholder="Draft resolution 1.1 · France" required />
        </Field>
        <Field label="Link" htmlFor="rl-url" error={fieldError(state, "url")}>
          <Input id="rl-url" name="url" type="url" inputMode="url" placeholder="https://docs.google.com/document/d/…" required />
        </Field>
        <div className="form-grid">
          <Field label="Type" htmlFor="rl-kind">
            <NativeSelect id="rl-kind" name="kind" defaultValue="draft_resolution">
              {RESOLUTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {RESOLUTION_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Notes" htmlFor="rl-notes" optional>
            <Textarea id="rl-notes" name="notes" rows={2} placeholder="Co-sponsors, status, what feedback you want." />
          </Field>
        </div>
        <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
        <div className="form-actions">
          <SubmitButton size="sm" pendingText="Sharing…">
            Share document
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function DeleteResolutionButton({ id }: { id: string }) {
  return (
    <ActionButton size="icon" variant="ghost" aria-label="Remove document" action={() => deleteResolutionLink(id)} confirm={{ title: "Remove this document link?", description: "The document itself is not deleted, only the link shared with the committee.", confirmLabel: "Remove" }}>
      <Trash2 className="size-4" aria-hidden />
    </ActionButton>
  );
}
