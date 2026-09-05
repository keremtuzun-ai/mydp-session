"use client";

import { useActionState } from "react";
import { LogOut, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile, updateAvatar, changePassword, signOutOtherSessions } from "@/actions/settings";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { GRADES } from "@/lib/validation/schemas";
import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, null);
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="form-grid">
        <Field label="Display name" htmlFor="display_name" className="full-width">
          <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} autoComplete="name" required />
        </Field>
        <Field label="Grade" htmlFor="grade">
          <NativeSelect id="grade" name="grade" defaultValue={profile.grade ?? "10"}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Phone" htmlFor="phone" optional>
          <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" />
        </Field>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function AvatarForm({ avatarUrl, name }: { avatarUrl: string | null; name: string | null }) {
  const [state, action] = useActionState(updateAvatar, null);
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
        </Avatar>
        <Field label="New photo" htmlFor="avatar" hint="Under 2 MB." className="flex-1">
          <Input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" />
        </Field>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton size="sm" variant="outline" pendingText="Uploading…">
          Update photo
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="form-grid">
        <Field label="New password" htmlFor="password" hint="8+ characters, a letter and a number.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm" htmlFor="confirm_password">
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="form-actions">
        <SubmitButton>Change password</SubmitButton>
      </div>
    </form>
  );
}

export function SessionControls() {
  return (
    <div className="flex flex-wrap gap-2">
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="destructive">
          <LogOut aria-hidden /> Sign out
        </Button>
      </form>
      <ActionButton variant="destructive" action={signOutOtherSessions} confirm={{ title: "Sign out other devices?", description: "Every other browser or phone signed in as you will need to sign in again. This device stays signed in.", confirmLabel: "Sign out others", destructive: false }}>
        <ShieldOff className="size-4" aria-hidden /> Sign out other devices
      </ActionButton>
    </div>
  );
}
