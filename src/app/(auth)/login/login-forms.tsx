"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { signInWithPassword, requestLoginCode } from "@/actions/auth";

export function LoginForms({ next }: { next: string }) {
  const [pwState, pwAction] = useActionState(signInWithPassword, null);
  const [otpState, otpAction] = useActionState(requestLoginCode, null);
  return (
    <Tabs defaultValue="password">
      <TabsList>
        <TabsTrigger value="password">Username &amp; password</TabsTrigger>
        <TabsTrigger value="code">School email code</TabsTrigger>
      </TabsList>
      <TabsContent value="password">
        <form action={pwAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="next" value={next} />
          <Field label="Username" htmlFor="username">
            <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <FormError message={pwState && !pwState.ok ? pwState.error : null} />
          <div className="form-actions">
            <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
            <Link href="/reset-password" className="prose-link small">
              Forgot your password?
            </Link>
          </div>
        </form>
      </TabsContent>
      <TabsContent value="code">
        <form action={otpAction} className="flex flex-col gap-4" noValidate>
          <Field label="School email" htmlFor="email" hint="We will email a sign-in link (and a code where the school's mail template supports it). Existing accounts only.">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </Field>
          <FormError message={otpState && !otpState.ok ? otpState.error : null} />
          <div className="form-actions">
            <SubmitButton pendingText="Sending…">Email me a sign-in code</SubmitButton>
          </div>
        </form>
      </TabsContent>
    </Tabs>
  );
}
