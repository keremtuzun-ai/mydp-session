"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createSession, updateSession } from "@/actions/sessions";
import { useRhfAction, toDatetimeLocal } from "@/components/forms/rhf-form";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { WeeklySession } from "@/lib/types/database";

const clientSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(140),
    theme: z.string().max(140),
    starts_at: z.string().min(1, "Choose a start time"),
    ends_at: z.string().min(1, "Choose an end time"),
    location: z.string().max(200),
    meeting_url: z.string(),
    dress_code: z.string().max(120),
    description: z.string().max(4000),
    general_agenda: z.string().max(6000),
    status: z.enum(["draft", "published", "completed", "cancelled"]),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), { path: ["ends_at"], message: "End must be after start" });
type Values = z.infer<typeof clientSchema>;

type Props = { session?: WeeklySession; committees: { id: string; acronym: string; name: string }[]; selectedCommitteeIds?: string[] };

export function SessionForm({ session, committees, selectedCommitteeIds = [] }: Props) {
  const action = session ? updateSession.bind(null, session.id) : createSession;
  const [state, dispatch, pending] = useActionState(action as (p: ActionResult | null, f: FormData) => Promise<ActionResult>, null);
  useActionFeedback(state);
  const form = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      title: session?.title ?? "",
      theme: session?.theme ?? "",
      starts_at: toDatetimeLocal(session?.starts_at),
      ends_at: toDatetimeLocal(session?.ends_at),
      location: session?.location ?? "Room B204",
      meeting_url: session?.meeting_url ?? "",
      dress_code: session?.dress_code ?? "",
      description: session?.description ?? "",
      general_agenda: session?.general_agenda ?? "1. Roll call\n2. Announcements from the Secretariat\n3. Committee time\n4. Chair debrief",
      status: session?.status ?? "draft",
    },
  });
  const { formRef, onSubmit } = useRhfAction(form.handleSubmit, dispatch);
  const { register, formState: { errors } } = form;
  const err = (n: keyof Values) => errors[n]?.message ?? fieldError(state, n);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="form-grid">
        <Field label="Title" htmlFor="title" error={err("title")} className="full-width">
          <Input id="title" {...register("title")} aria-invalid={Boolean(err("title"))} />
        </Field>
        <Field label="Theme" htmlFor="theme" optional error={err("theme")} className="full-width">
          <Input id="theme" placeholder="e.g. Moderated caucus practice" {...register("theme")} />
        </Field>
        <Field label="Starts" htmlFor="starts_at" error={err("starts_at")}>
          <Input id="starts_at" type="datetime-local" {...register("starts_at")} aria-invalid={Boolean(err("starts_at"))} />
        </Field>
        <Field label="Ends" htmlFor="ends_at" error={err("ends_at")}>
          <Input id="ends_at" type="datetime-local" {...register("ends_at")} aria-invalid={Boolean(err("ends_at"))} />
        </Field>
        <Field label="Location" htmlFor="location" optional error={err("location")}>
          <Input id="location" {...register("location")} />
        </Field>
        <Field label="Online link" htmlFor="meeting_url" optional error={err("meeting_url")}>
          <Input id="meeting_url" type="url" placeholder="https://" {...register("meeting_url")} />
        </Field>
        <Field label="Dress code" htmlFor="dress_code" optional error={err("dress_code")}>
          <Input id="dress_code" placeholder="Western business attire" {...register("dress_code")} />
        </Field>
        <Field label="Status" htmlFor="status" error={err("status")}>
          <NativeSelect id="status" {...register("status")}>
            <option value="draft">Draft (hidden from delegates)</option>
            <option value="published">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </NativeSelect>
        </Field>
        <Field label="Description" htmlFor="description" optional error={err("description")} className="full-width">
          <Textarea id="description" rows={2} {...register("description")} />
        </Field>
        <Field label="General agenda" htmlFor="general_agenda" optional error={err("general_agenda")} className="full-width">
          <Textarea id="general_agenda" rows={5} {...register("general_agenda")} />
        </Field>
      </div>

      <fieldset>
        <legend className="section-label">Committees meeting this week</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {committees.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-[7px] border border-line px-3 py-2 bg-surface">
              <Checkbox id={`c-${c.id}`} name="committee_ids" value={c.id} defaultChecked={selectedCommitteeIds.includes(c.id)} />
              <Label htmlFor={`c-${c.id}`} className="cursor-pointer normal-case tracking-normal text-[0.88rem] font-medium text-ink">
                <span className="font-[650]">{c.acronym}</span> <span className="muted">{c.name}</span>
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="form-actions">
        <Button type="submit" loading={pending}>
          {session ? "Save changes" : "Create session"}
        </Button>
      </div>
    </form>
  );
}
