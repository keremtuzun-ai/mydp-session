"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { uploadEvidence, type SubmissionReceipt } from "@/actions/tasks";
import { ACCEPT_ATTRIBUTE } from "@/lib/validation/files";
import { MAX_SENIORS, MIN_SENIORS, SENIORS } from "@/lib/seniors";

/**
 * "Submit" button that opens a dialog. A submission is the link to the
 * document AND the file itself, plus the delegation it was written for and
 * the senior(s) behind it (at least one, at most two). A successful
 * submission turns the dialog into a confirmation with a tick.
 */
export function UploadDialog({ taskId, size = "sm", variant = "default", defaultDelegation }: { taskId: string; size?: "sm" | "default"; variant?: "default" | "outline"; defaultDelegation?: string | null }) {
  const [open, setOpen] = useState(false);
  // Remount the form on every opening so a finished submission does not linger.
  const [session, setSession] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSession((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <Upload className="size-4" aria-hidden /> Submit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <UploadForm key={session} taskId={taskId} defaultDelegation={defaultDelegation} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UploadForm({ taskId, defaultDelegation, onClose }: { taskId: string; defaultDelegation?: string | null; onClose: () => void }) {
  const [state, action] = useActionState(uploadEvidence, null);
  const router = useRouter();
  const receipt: SubmissionReceipt | null = state?.ok ? state.data : null;
  useEffect(() => {
    if (receipt) router.refresh();
  }, [receipt, router]);

  if (receipt) {
    return (
      <div className="submit-done" role="status">
        <span className="submit-done-tick" aria-hidden>
          <Check className="size-8" strokeWidth={2.5} />
        </span>
        <DialogHeader className="items-center text-center">
          <span className="page-kicker">Submitted</span>
          <DialogTitle>Your resolution is in.</DialogTitle>
        </DialogHeader>
        <p className="m-0 small text-center">
          <span className="chip chip-navy">{receipt.delegation}</span>
          <span className="block mt-2 mono muted">{receipt.fileName}</span>
        </p>
        <p className="m-0 small muted text-center">
          {receipt.replaced ? "It replaces the resolution delegates were seeing for your delegation." : "The Secretariat now has the link and the file."}
        </p>
        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Submit your work</DialogTitle>
      </DialogHeader>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="task_id" value={taskId} />
        <p className="m-0 small muted">Both the link and the file are required.</p>
        <Field label="Link to the document" htmlFor="up-url" hint="Share it as “Anyone with the link”.">
          <Input id="up-url" name="external_url" type="url" inputMode="url" placeholder="https://docs.google.com/document/d/…" required autoFocus />
        </Field>
        <Field label="File" htmlFor="up-file" hint="PDF, DOCX, PNG or JPG. A PDF previews best.">
          <Input id="up-file" name="file" type="file" accept={ACCEPT_ATTRIBUTE} required />
        </Field>
        <Field label="Delegation" htmlFor="up-delegation" hint="The country or body you represent. If this isn't affiliated with a delegation, write N/A.">
          <Input id="up-delegation" name="delegation" placeholder="e.g. France" defaultValue={defaultDelegation ?? ""} required />
        </Field>
        <SeniorPicker />
        <FormError message={state && !state.ok ? state.error : null} />
        <DialogFooter>
          <SubmitButton pendingText="Submitting…">Submit</SubmitButton>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * A checkbox list of the seniors. Native checkboxes so the plain form action
 * receives every "seniors" value; the first box carries the "pick at least
 * one" validity message and the rest lock once the maximum is reached.
 */
function SeniorPicker() {
  const [chosen, setChosen] = useState<string[]>([]);
  const firstRef = useRef<HTMLInputElement>(null);
  const full = chosen.length >= MAX_SENIORS;

  useEffect(() => {
    firstRef.current?.setCustomValidity(chosen.length < MIN_SENIORS ? "Pick at least one senior." : "");
  }, [chosen]);

  const toggle = (name: string, on: boolean) => setChosen((prev) => (on ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((n) => n !== name)));

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="label-caps mb-1">
        Seniors <span className="muted">(pick {MIN_SENIORS} or {MAX_SENIORS})</span>
      </legend>
      <ul className="senior-picker m-0 list-none p-0" role="group" aria-label="Seniors">
        {SENIORS.map((name, i) => {
          const on = chosen.includes(name);
          return (
            <li key={name}>
              <label className={`senior-option${on ? " is-on" : ""}${!on && full ? " is-locked" : ""}`}>
                <input
                  ref={i === 0 ? firstRef : undefined}
                  type="checkbox"
                  name="seniors"
                  value={name}
                  checked={on}
                  disabled={!on && full}
                  onChange={(e) => toggle(name, e.target.checked)}
                />
                <span>{name}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="m-0 small muted" aria-live="polite">
        {chosen.length === 0 ? "None picked yet." : `Picked: ${chosen.join(", ")}`}
      </p>
    </fieldset>
  );
}
