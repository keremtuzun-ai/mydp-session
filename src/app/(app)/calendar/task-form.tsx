"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createTask, updateTask } from "@/actions/tasks";
import { useRhfAction, toDatetimeLocal } from "@/components/forms/rhf-form";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { Task } from "@/lib/types/database";

const clientSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(140),
  description: z.string().max(4000),
  assigned_to_profile_id: z.string(),
  assigned_role: z.string(),
  assigned_committee_id: z.string(),
  session_id: z.string(),
  due_at: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});
type Values = z.infer<typeof clientSchema>;

type Props = {
  task?: Task;
  committees: { id: string; acronym: string; name: string }[];
  sessions: { id: string; title: string; starts_at: string }[];
  members: { id: string; name: string; committee_id: string }[];
  isStaff: boolean;
  defaults?: { committee?: string; session?: string };
};

export function TaskForm({ task, committees, sessions, members, isStaff, defaults }: Props) {
  const router = useRouter();
  const action = task ? updateTask.bind(null, task.id) : createTask;
  const [state, dispatch, pending] = useActionState(action as (p: ActionResult<unknown> | null, f: FormData) => Promise<ActionResult<unknown>>, null);
  useActionFeedback(state, () => {
    if (state?.ok && state.data && typeof state.data === "object" && "id" in state.data) router.push(`/calendar/${(state.data as { id: string }).id}`);
    else if (task) router.push(`/calendar/${task.id}`);
  });
  const form = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigned_to_profile_id: task?.assigned_to_profile_id ?? "",
      assigned_role: task?.assigned_role ?? "",
      assigned_committee_id: task?.assigned_committee_id ?? defaults?.committee ?? committees[0]?.id ?? "",
      session_id: task?.session_id ?? defaults?.session ?? "",
      due_at: toDatetimeLocal(task?.due_at),
      priority: task?.priority ?? "normal",
    },
  });
  const { formRef, onSubmit } = useRhfAction(form.handleSubmit, dispatch);
  const { register, formState: { errors }, control } = form;
  const err = (n: keyof Values) => errors[n]?.message ?? fieldError(state, n);
  const committeeId = useWatch({ control, name: "assigned_committee_id" });
  const eligible = members.filter((m) => !committeeId || m.committee_id === committeeId);
  const uniqueEligible = Array.from(new Map(eligible.map((m) => [m.id, m])).values());

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Title" htmlFor="title" error={err("title")}>
        <Input id="title" placeholder="Submit position paper: …" {...register("title")} aria-invalid={Boolean(err("title"))} />
      </Field>
      <Field label="Instructions" htmlFor="description" optional error={err("description")}>
        <Textarea id="description" rows={4} {...register("description")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Committee" htmlFor="assigned_committee_id" error={err("assigned_committee_id")} hint={isStaff ? "Leave empty for a programme-wide task." : "Chairs assign within their own committee."}>
          <NativeSelect id="assigned_committee_id" {...register("assigned_committee_id")}>
            {isStaff ? <option value="">No committee</option> : null}
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym} · {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Assign to member" htmlFor="assigned_to_profile_id" error={err("assigned_to_profile_id")} hint="Leave empty to address the whole committee or role.">
          <NativeSelect id="assigned_to_profile_id" {...register("assigned_to_profile_id")}>
            <option value="">Everyone in scope</option>
            {uniqueEligible.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {isStaff ? (
          <Field label="Or assign to a role" htmlFor="assigned_role" error={err("assigned_role")}>
            <NativeSelect id="assigned_role" {...register("assigned_role")}>
              <option value="">No role targeting</option>
              <option value="delegate">All delegates</option>
              <option value="chair">All chairs</option>
              <option value="executive">All executives</option>
            </NativeSelect>
          </Field>
        ) : (
          <input type="hidden" value="" {...register("assigned_role")} />
        )}
        <Field label="Linked session" htmlFor="session_id" optional error={err("session_id")}>
          <NativeSelect id="session_id" {...register("session_id")}>
            <option value="">No session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {new Date(s.starts_at).toLocaleDateString()}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Due" htmlFor="due_at" optional error={err("due_at")}>
          <Input id="due_at" type="datetime-local" {...register("due_at")} />
        </Field>
        <Field label="Priority" htmlFor="priority" error={err("priority")}>
          <NativeSelect id="priority" {...register("priority")}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </NativeSelect>
        </Field>
      </div>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {task ? "Save changes" : "Assign task"}
        </Button>
      </div>
    </form>
  );
}
