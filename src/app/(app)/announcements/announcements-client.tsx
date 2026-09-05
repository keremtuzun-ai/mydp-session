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
    <Card className={`${a.pinned ? "border-t-2 border-t-[var(--rule-strong)]" : ""} ${!isRead ? "!border-l-[3px] !border-l-[var(--navy)]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {a.pinned ? (
              <Badge variant="gold">
                <Pin className="size-3" aria-hidden /> Pinned
              </Badge>
            ) : null}
            {!isRead ? <Badge variant="navy" dot className="chip-pulse">New</Badge> : null}
            <Badge variant="secondary">{audience}</Badge>
          </div>
          <h2 className="mt-2 m-0 text-[1.25rem]">{a.title}</h2>
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
      <p className="m-0 mt-3 whitespace-pre-wrap text-[0.92rem]">{a.body}</p>
      <p className="m-0 mt-3 dateline">
        {authorName} · {formatDateTime(a.published_at)}
      </p>
    </Card>
  );
}

type Ref = { id: string; acronym?: string; title?: string };

export function NewAnnouncementForm({ sessions, defaultCommittee, defaultAuthor = "" }: { committees?: Ref[]; sessions: Ref[]; isStaff?: boolean; defaultCommittee: string; defaultAuthor?: string }) {
  const [state, action] = useActionState(createAnnouncement, null);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => formRef.current?.reset());
  return (
    <Card>
      <div className="section-head"><h2>Post an announcement</h2></div>
      <p className="mb-4 small muted">Target everyone, a role or a session.</p>
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <Field label="Your name and surname" htmlFor="a-author" error={fieldError(state, "author_name")} hint="Shown under the announcement as its author.">
          <Input id="a-author" name="author_name" placeholder="Name Surname" autoComplete="name" defaultValue={defaultAuthor} required />
        </Field>
        <Field label="Title" htmlFor="a-title" error={fieldError(state, "title")}>
          <Input id="a-title" name="title" required />
        </Field>
        <Field label="Message" htmlFor="a-body" error={fieldError(state, "body")}>
          <Textarea id="a-body" name="body" rows={5} required />
        </Field>
        <Field label="Audience role" htmlFor="a-role" optional>
            <NativeSelect id="a-role" name="target_role" defaultValue="">
              <option value="">Everyone</option>
              <option value="delegate">Delegates</option>
              <option value="chair">Chairs</option>
              <option value="executive">Executives</option>
            </NativeSelect>
          </Field>
        <input type="hidden" name="target_committee_id" value={defaultCommittee} />
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
        <div className="flex items-center gap-2">
            <Checkbox id="a-pinned" name="pinned" />
            <Label htmlFor="a-pinned" className="normal-case tracking-normal text-[0.88rem] font-medium text-ink">Pin to the top</Label>
          </div>
        <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
        <div className="form-actions">
          <SubmitButton pendingText="Posting…">Publish</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
