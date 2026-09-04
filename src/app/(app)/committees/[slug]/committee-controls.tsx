"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { Card } from "@/components/ui/card";
import { CommitteeForm } from "../committee-form";
import { deleteCommittee, upsertMembership, removeMembership, submitToCommittee, deleteSubmission } from "@/actions/committees";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { ACCEPT_ATTRIBUTE } from "@/lib/validation/files";
import type { Committee } from "@/lib/types/database";

export function CommitteeManagePanel({ committee, canRename, canDelete }: { committee: Committee; canRename: boolean; canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Pencil className="size-4" aria-hidden /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit committee</DialogTitle>
            <DialogDescription>{canRename ? "Changes apply immediately." : "Chairs can update the topic, description, guide and settings."}</DialogDescription>
          </DialogHeader>
          <CommitteeForm committee={committee} canRename={canRename} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      {canDelete ? (
        <ActionButton
          size="sm"
          variant="destructive"
          action={() => deleteCommittee(committee.id)}
          onSuccess={() => router.push("/committees")}
          confirm={{ title: `Delete ${committee.acronym}?`, description: "Memberships, session blocks, tasks links and materials for this committee will be removed. This cannot be undone.", confirmLabel: "Delete committee" }}
        >
          <Trash2 className="size-4" aria-hidden /> Delete
        </ActionButton>
      ) : null}
    </div>
  );
}

export function AddMember({ committeeId, canAppointChairs }: { committeeId: string; canAppointChairs: boolean }) {
  const [state, action] = useActionState(upsertMembership, null);
  useActionFeedback(state);
  return (
    <Card className="mt-3 p-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="committee_id" value={committeeId} />
        <div className="sm:col-span-3 text-sm font-medium">Add a member by username</div>
        <Field label="Username" htmlFor="add-username">
          <Input id="add-username" name="username" placeholder="e.g. ayse-demir" autoCapitalize="none" required />
        </Field>
        <Field label="Role" htmlFor="add-role">
          <NativeSelect id="add-role" name="membership_role" defaultValue="delegate">
            <option value="delegate">Delegate</option>
            {canAppointChairs ? (
              <>
                <option value="co_chair">Co-Chair</option>
                <option value="chair">Chair</option>
                <option value="executive">Executive</option>
              </>
            ) : null}
          </NativeSelect>
        </Field>
        <Field label="Delegation" htmlFor="add-delegation" optional>
          <Input id="add-delegation" name="delegation" placeholder="e.g. France" />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <div className="sm:col-span-3 flex justify-end">
          <SubmitButton size="sm">
            <UserPlus className="size-4" aria-hidden /> Add member
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function RemoveMember({ membershipId, name }: { membershipId: string; name: string }) {
  return (
    <ActionButton
      size="icon"
      variant="ghost"
      aria-label={`Remove ${name}`}
      action={() => removeMembership(membershipId)}
      confirm={{ title: `Remove ${name}?`, description: "They will lose access to this committee's workspace and tasks.", confirmLabel: "Remove" }}
    >
      <X className="size-4" aria-hidden />
    </ActionButton>
  );
}

export function SubmissionForm({ committeeId }: { committeeId: string }) {
  const [state, action] = useActionState(submitToCommittee, null);
  useActionFeedback(state);
  return (
    <Card className="p-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="committee_id" value={committeeId} />
        <p className="text-sm font-medium">Submit a position paper</p>
        <Field label="Title" htmlFor="sub-title">
          <Input id="sub-title" name="title" placeholder="Position paper, France" required />
        </Field>
        <Field label="Notes" htmlFor="sub-notes" optional>
          <Textarea id="sub-notes" name="notes" rows={2} />
        </Field>
        <Field label="File" htmlFor="sub-file" hint="PDF, PNG, JPG or DOCX.">
          <Input id="sub-file" name="file" type="file" accept={ACCEPT_ATTRIBUTE} required />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <div className="flex justify-end">
          <SubmitButton size="sm" variant="gold" pendingText="Uploading…">
            Submit
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function DeleteSubmissionButton({ id }: { id: string }) {
  return (
    <ActionButton size="sm" variant="ghost" action={() => deleteSubmission(id)} confirm={{ title: "Remove this submission?", description: "The file will be deleted.", confirmLabel: "Remove" }}>
      <Trash2 className="size-4" aria-hidden />
      <span className="sr-only">Remove</span>
    </ActionButton>
  );
}
