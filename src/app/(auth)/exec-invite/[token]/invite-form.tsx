"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { joinExecutives } from "@/actions/exec-invite";
import { fieldError } from "@/hooks/use-action-feedback";

export function ExecInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(joinExecutives, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="School email" htmlFor="email" error={fieldError(state, "email")} hint="The address you will sign in with.">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@school.edu" required autoFocus aria-invalid={Boolean(fieldError(state, "email"))} />
      </Field>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Adding you…">Join the executive team</SubmitButton>
      </div>
    </form>
  );
}
