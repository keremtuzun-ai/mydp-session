"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInWithEmailPassword } from "@/actions/auth";

export function LoginForms({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithEmailPassword, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Name and surname" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" placeholder="Name Surname" required autoFocus />
      </Field>
      <Field label="School email" htmlFor="email">
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
