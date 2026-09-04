"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { verifyEmailCode, requestLoginCode, startFirstTimeSetup } from "@/actions/auth";

export function VerifyForm({ email, flow }: { email: string; flow: "setup" | "login" }) {
  const [state, action] = useActionState(verifyEmailCode, null);
  const [resendState, resendAction] = useActionState(flow === "setup" ? startFirstTimeSetup : requestLoginCode, null);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="email" value={email} />
        <Field label="Verification code" htmlFor="token">
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            className="text-center font-mono text-2xl tracking-[0.5em]"
            required
            autoFocus
          />
        </Field>
        <FormError message={state && !state.ok ? state.error : null} />
        <SubmitButton className="w-full" variant="gold" pendingText="Verifying…">
          {flow === "setup" ? "Verify and continue" : "Verify and sign in"}
        </SubmitButton>
      </form>
      <form action={resendAction} className="flex items-center justify-between text-sm">
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="link" className="px-0">
          Resend code
        </Button>
        <Link href={flow === "setup" ? "/welcome" : "/login"} className="text-muted-foreground underline-offset-4 hover:underline">
          Use a different email
        </Link>
      </form>
      <FormError message={resendState && !resendState.ok ? resendState.error : null} />
    </div>
  );
}
