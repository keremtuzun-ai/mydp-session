"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInExecutive } from "@/actions/exec-access";

export function ExecPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(signInExecutive, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Executive password" htmlFor="password" hint="Shared by the whole Secretariat. Ask the admin if you do not have it.">
        <Input id="password" name="password" type="password" autoComplete="off" required autoFocus />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Opening…">Open the executive desk</SubmitButton>
      </div>
    </form>
  );
}
