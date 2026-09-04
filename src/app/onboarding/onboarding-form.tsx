"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { onboardingSchema, GRADES } from "@/lib/validation/schemas";
import { completeOnboarding } from "@/actions/onboarding";
import { useRhfAction } from "@/components/forms/rhf-form";
import { fieldError } from "@/hooks/use-action-feedback";

type FormValues = z.input<typeof onboardingSchema>;

export function OnboardingForm() {
  const [state, dispatch, pending] = useActionState(completeOnboarding, null);
  const form = useForm<FormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: { display_name: "", grade: "10", phone: "", username: "", password: "", confirm_password: "" },
  });
  const { formRef, onSubmit } = useRhfAction(form.handleSubmit, dispatch);
  const { register, formState: { errors }, control } = form;

  const username = useWatch({ control, name: "username" });
  const [checked, setChecked] = useState<{ value: string; available: boolean; reason?: string } | null>(null);
  useEffect(() => {
    if (!username || username.length < 3) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username-available?u=${encodeURIComponent(username)}`, { signal: controller.signal });
        const data = (await res.json()) as { available?: boolean; reason?: string | null; error?: string };
        if (!data.error) setChecked({ value: username, available: Boolean(data.available), reason: data.reason ?? undefined });
      } catch {
        // aborted or offline: leave the previous result in place
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [username]);
  const availability: { status: "idle" | "checking" | "ok" | "taken"; reason?: string } =
    !username || username.length < 3
      ? { status: "idle" }
      : checked?.value === username
        ? checked.available
          ? { status: "ok" }
          : { status: "taken", reason: checked.reason ?? "That username is not available" }
        : { status: "checking" };

  const err = (name: keyof FormValues | "avatar") => (name === "avatar" ? fieldError(state, "avatar") : errors[name]?.message ?? fieldError(state, name));

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="form-grid">
        <Field label="Full name" htmlFor="display_name" error={err("display_name")} className="full-width">
          <Input id="display_name" autoComplete="name" aria-invalid={Boolean(err("display_name"))} {...register("display_name")} />
        </Field>
        <Field label="Grade" htmlFor="grade" error={err("grade")}>
          <NativeSelect id="grade" {...register("grade")}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Phone" htmlFor="phone" optional error={err("phone")}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+90 5xx xxx xx xx" {...register("phone")} />
        </Field>
      </div>

      <Field label="Username" htmlFor="username" error={err("username") ?? (availability.status === "taken" ? availability.reason : undefined)} hint="3 to 24 characters: lowercase letters, numbers, hyphens. This cannot be changed later.">
        <div className="relative">
          <Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} className="pr-9" aria-invalid={Boolean(err("username")) || availability.status === "taken"} {...register("username", { setValueAs: (v: string) => v.trim().toLowerCase() })} />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-live="polite">
            {availability.status === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Checking" /> : null}
            {availability.status === "ok" ? <CheckCircle2 className="size-4 text-success" aria-label="Available" /> : null}
            {availability.status === "taken" ? <XCircle className="size-4 text-destructive" aria-label="Taken" /> : null}
          </span>
        </div>
      </Field>

      <div className="form-grid">
        <Field label="Password" htmlFor="password" error={err("password")} hint="At least 10 characters, with a letter and a number.">
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(err("password"))} {...register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password" error={err("confirm_password")}>
          <Input id="confirm_password" type="password" autoComplete="new-password" aria-invalid={Boolean(err("confirm_password"))} {...register("confirm_password")} />
        </Field>
      </div>

      <Field label="Profile photo" htmlFor="avatar" optional error={err("avatar")} hint="PNG, JPG or WebP, under 2 MB.">
        <Input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" />
      </Field>

      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="form-actions">
        <Button type="submit" loading={pending} disabled={availability.status === "taken"}>
          Finish setup
        </Button>
      </div>
    </form>
  );
}
