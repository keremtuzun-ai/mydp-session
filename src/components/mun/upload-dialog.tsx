"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { uploadEvidence } from "@/actions/tasks";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ACCEPT_ATTRIBUTE } from "@/lib/validation/files";
import { cn } from "@/lib/utils";

/** "Upload" button that opens a dialog: paste a link or pick a file, plus the delegation. */
export function UploadDialog({ taskId, size = "sm", variant = "default" }: { taskId: string; size?: "sm" | "default"; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [state, action] = useActionState(uploadEvidence, null);
  const router = useRouter();
  useActionFeedback(state, () => {
    setOpen(false);
    router.refresh();
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <Upload className="size-4" aria-hidden /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="task_id" value={taskId} />
          <div role="tablist" className="filter-pills">
            <button type="button" role="tab" aria-selected={mode === "link"} className={cn("filter-pill", mode === "link" && "active")} onClick={() => setMode("link")}>
              Paste a link
            </button>
            <button type="button" role="tab" aria-selected={mode === "file"} className={cn("filter-pill", mode === "file" && "active")} onClick={() => setMode("file")}>
              Upload a file
            </button>
          </div>
          {mode === "link" ? (
            <Field label="Link" htmlFor="up-url" hint="Share it as “Anyone with the link”.">
              <Input id="up-url" name="external_url" type="url" inputMode="url" placeholder="https://docs.google.com/document/d/…" required autoFocus />
            </Field>
          ) : (
            <Field label="File" htmlFor="up-file" hint="PDF, DOCX, PNG or JPG.">
              <Input id="up-file" name="file" type="file" accept={ACCEPT_ATTRIBUTE} required />
            </Field>
          )}
          <Field label="Delegation" htmlFor="up-delegation" hint="If this isn't affiliated with a delegation, write N/A.">
            <Input id="up-delegation" name="delegation" placeholder="e.g. France" required />
          </Field>
          <FormError message={state && !state.ok ? state.error : null} />
          <DialogFooter>
            <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
