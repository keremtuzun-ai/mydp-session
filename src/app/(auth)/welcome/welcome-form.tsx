"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { startFirstTimeSetup } from "@/actions/auth";

export function WelcomeForm() {
  const [state, action] = useActionState(startFirstTimeSetup, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="School email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@school.edu" required autoFocus />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Sending…">Send verification email</SubmitButton>
      </div>
    </form>
  );
}
