"use client";

import { useActionState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { createMemberAccount, type NewMember } from "@/actions/members";
import { fieldError } from "@/hooks/use-action-feedback";
import { formatAccessCode, MEMBER_TIERS, TIER_LABEL } from "@/lib/auth/access-code";

export function CopyCodeButton({ code, label }: { code: string; label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      aria-label={label ?? `Copy access code ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          toast.success("Access code copied.");
        } catch {
          window.prompt("Copy the access code:", code);
        }
      }}
    >
      <Copy className="size-4" aria-hidden /> Copy
    </button>
  );
}

/**
 * Name, surname, junior or senior. The account is ready the moment it is
 * created and its access code appears here once, then stays in the table.
 */
export function CreateMemberForm() {
  const [state, action, pending] = useActionState(createMemberAccount, null);
  const created: NewMember | null = state?.ok ? state.data : null;

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Name" htmlFor="new_first_name" error={fieldError(state, "first_name")}>
            <Input id="new_first_name" name="first_name" autoComplete="off" placeholder="Name" required aria-invalid={Boolean(fieldError(state, "first_name"))} />
          </Field>
          <Field label="Surname" htmlFor="new_last_name" error={fieldError(state, "last_name")}>
            <Input id="new_last_name" name="last_name" autoComplete="off" placeholder="Surname" required aria-invalid={Boolean(fieldError(state, "last_name"))} />
          </Field>
          <Field label="Member" htmlFor="new_tier" error={fieldError(state, "tier")}>
            <NativeSelect id="new_tier" name="tier" defaultValue="junior" className="sm:w-36">
              {MEMBER_TIERS.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
        <div className="form-actions">
          <SubmitButton pendingText="Creating…" disabled={pending}>
            Create account
          </SubmitButton>
          <span className="small muted">The 12-character access code is generated automatically and cannot be changed.</span>
        </div>
      </form>

      {created ? (
        <div className="flash flash-success new-member-code" role="status">
          <div>
            <strong>{created.name}</strong> · {TIER_LABEL[created.tier]} · <span className="mono">{created.username}</span>
            <br />
            <span className="small">Give them this access code. It is also listed in the table below.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="code-pill access-code-pill">{formatAccessCode(created.code)}</span>
            <CopyCodeButton code={created.code} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
