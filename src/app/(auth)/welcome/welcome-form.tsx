"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUpWithPassword } from "@/actions/auth";
import { fieldError } from "@/hooks/use-action-feedback";

export function SignUpForm() {
  const [state, action] = useActionState(signUpWithPassword, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required autoFocus aria-invalid={Boolean(fieldError(state, "email"))} />
      </Field>
      <div className="form-grid">
        <Field label="Password" htmlFor="password" error={fieldError(state, "password")} hint="8+ characters, a letter and a number.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(fieldError(state, "password"))} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password" error={fieldError(state, "confirm_password")}>
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required aria-invalid={Boolean(fieldError(state, "confirm_password"))} />
        </Field>
      </div>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </div>
    </form>
  );
}
