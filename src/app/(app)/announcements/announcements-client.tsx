"use client";

import { useActionState, useRef } from "react";
import { Pin, PinOff, Trash2, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { createAnnouncement, deleteAnnouncement, togglePin, markAnnouncementRead } from "@/actions/announcements";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import { formatDateTime } from "@/lib/utils";
import type { Announcement } from "@/lib/types/database";

export function AnnouncementCard({ announcement: a, authorName, audience, isRead, canManage, canPin }: { announcement: Announcement; authorName: string; audience: string; isRead: boolean; canManage: boolean; canPin: boolean }) {
  return (
    <Card className={`p-5 ${a.pinned ? "border-gold-deep/50" : ""} ${!isRead ? "bg-gradient-to-br from-card to-accent/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {a.pinned ? (
              <Badge variant="gold">
                <Pin className="size-3" aria-hidden /> Pinned
              </Badge>
            ) : null}
            {!isRead ? <Badge variant="info">New</Badge> : null}
            <Badge variant="outline">{audience}</Badge>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-tight">{a.title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {!isRead ? (
            <ActionButton size="sm" variant="ghost" action={() => markAnnouncementRead(a.id)}>
              <CheckCheck className="size-4" aria-hidden /> Mark read
            </ActionButton>
          ) : null}
          {canPin ? (
            <ActionButton size="icon" variant="ghost" aria-label={a.pinned ? "Unpin" : "Pin"} action={() => togglePin(a.id, !a.pinned)}>
              {a.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
            </ActionButton>
          ) : null}
          {canManage ? (
            <ActionButton size="icon" variant="ghost" aria-label="Delete announcement" action={() => deleteAnnouncement(a.id)} confirm={{ title: "Delete this announcement?", description: "It disappears for everyone.", confirmLabel: "Delete" }}>
              <Trash2 className="size-4" aria-hidden />
            </ActionButton>
          ) : null}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {authorName} · {formatDateTime(a.published_at)}
      </p>
    </Card>
  );
}

type Ref = { id: string; acronym?: string; title?: string };

export function NewAnnouncementForm({ committees, sessions, isStaff, defaultCommittee }: { committees: Ref[]; sessions: Ref[]; isStaff: boolean; defaultCommittee: string }) {
  const [state, action] = useActionState(createAnnouncement, null);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => formRef.current?.reset());
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold">Post an announcement</h2>
      <p className="mb-4 text-sm text-muted-foreground">{isStaff ? "Target everyone, a role, a committee or a session." : "Chairs post to the committees they chair."}</p>
      <form ref={formRef} action={action} className="space-y-4">
        <Field label="Title" htmlFor="a-title" error={fieldError(state, "title")}>
          <Input id="a-title" name="title" required />
        </Field>
        <Field label="Message" htmlFor="a-body" error={fieldError(state, "body")}>
          <Textarea id="a-body" name="body" rows={5} required />
        </Field>
        {isStaff ? (
          <Field label="Audience role" htmlFor="a-role" optional>
            <NativeSelect id="a-role" name="target_role" defaultValue="">
              <option value="">Everyone</option>
              <option value="delegate">Delegates</option>
              <option value="chair">Chairs</option>
              <option value="executive">Executives</option>
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Committee" htmlFor="a-committee" optional={isStaff}>
          <NativeSelect id="a-committee" name="target_committee_id" defaultValue={defaultCommittee || (isStaff ? "" : committees[0]?.id ?? "")}>
            {isStaff ? <option value="">All committees</option> : null}
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {isStaff ? (
          <Field label="Session" htmlFor="a-session" optional>
            <NativeSelect id="a-session" name="target_session_id" defaultValue="">
              <option value="">Not tied to a session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        {isStaff ? (
          <div className="flex items-center gap-2">
            <Checkbox id="a-pinned" name="pinned" />
            <Label htmlFor="a-pinned">Pin to the top</Label>
          </div>
        ) : null}
        <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
        <div className="flex justify-end">
          <SubmitButton pendingText="Posting…">Publish</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
