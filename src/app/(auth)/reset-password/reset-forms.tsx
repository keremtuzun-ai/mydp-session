"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { requestPasswordReset, verifyRecoveryCode, updatePasswordFromRecovery } from "@/actions/auth";

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  const [codeState, codeAction] = useActionState(verifyRecoveryCode, null);
  const [email, setEmail] = useState("");
  const sent = state?.ok;
  return (
    <div className="space-y-6">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field label="School email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <FormSuccess message={sent ? state.message : null} />
        <SubmitButton pendingText="Sending…">
          {sent ? "Send again" : "Send reset email"}
        </SubmitButton>
      </form>
      {sent ? (
        <form action={codeAction} className="card card-tight flex flex-col gap-4" noValidate>
          <span className="section-label m-0">Have a code from the email?</span>
          <input type="hidden" name="email" value={email} />
          <Field label="Recovery code" htmlFor="token">
            <Input id="token" name="token" inputMode="numeric" pattern="\d{6}" maxLength={6} className="code-input" />
          </Field>
          <FormError message={codeState && !codeState.ok ? codeState.error : null} />
          <SubmitButton variant="outline">
            Continue with code
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePasswordFromRecovery, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="New password" htmlFor="password" hint="At least 10 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm_password">
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
      </Field>
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton pendingText="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
