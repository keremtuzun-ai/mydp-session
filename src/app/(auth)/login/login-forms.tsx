"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInWithAccessCode } from "@/actions/auth";
import { fieldError } from "@/hooks/use-action-feedback";
import { ACCESS_CODE_LENGTH, formatAccessCode, normalizeAccessCode } from "@/lib/auth/access-code";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithAccessCode, null);
  const [code, setCode] = useState("");
  const error = fieldError(state, "code");
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Access code" htmlFor="code" error={error} hint={`${ACCESS_CODE_LENGTH} characters: capital letters and digits.`}>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(formatAccessCode(normalizeAccessCode(e.target.value).slice(0, ACCESS_CODE_LENGTH)))}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder="ABCD-EFGH-1234"
          className="access-code-input"
          maxLength={ACCESS_CODE_LENGTH + 2}
          required
          autoFocus
          aria-invalid={Boolean(error)}
        />
      </Field>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="form-actions">
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </div>
    </form>
  );
}
