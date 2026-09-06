"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInWithEmailPassword } from "@/actions/auth";
import { fieldError } from "@/hooks/use-action-feedback";

export function LoginForms({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithEmailPassword, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="first_name" error={fieldError(state, "first_name")}>
          <Input id="first_name" name="first_name" autoComplete="given-name" placeholder="Name" required autoFocus />
        </Field>
        <Field label="Surname" htmlFor="last_name" error={fieldError(state, "last_name")}>
          <Input id="last_name" name="last_name" autoComplete="family-name" placeholder="Surname" required />
        </Field>
      </div>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        <Link href="/reset-password" className="prose-link small">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
