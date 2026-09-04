"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createCommittee, updateCommittee } from "@/actions/committees";
import { useRhfAction } from "@/components/forms/rhf-form";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import type { Committee } from "@/lib/types/database";

const clientSchema = z.object({
  acronym: z.string().trim().min(2).max(16),
  name: z.string().trim().min(3).max(140),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Lowercase letters, numbers and hyphens"),
  category: z.string().trim().min(2).max(60),
  description: z.string().max(2000),
  current_topic: z.string().max(300),
  background_guide_url: z.string(),
});
type Values = z.infer<typeof clientSchema>;

export function CommitteeForm({ committee, canRename = true, onDone }: { committee?: Committee; canRename?: boolean; onDone?: () => void }) {
  const action = committee ? updateCommittee.bind(null, committee.id) : createCommittee;
  const [state, dispatch, pending] = useActionState(action as (p: ActionResult | null, f: FormData) => Promise<ActionResult>, null);
  useActionFeedback(state, onDone);
  const form = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      acronym: committee?.acronym ?? "",
      name: committee?.name ?? "",
      slug: committee?.slug ?? "",
      category: committee?.category ?? "General Assembly",
      description: committee?.description ?? "",
      current_topic: committee?.current_topic ?? "",
      background_guide_url: committee?.background_guide_url ?? "",
    },
  });
  const { formRef, onSubmit } = useRhfAction(form.handleSubmit, dispatch);
  const { register, formState: { errors }, setValue, getValues } = form;
  const err = (n: keyof Values) => errors[n]?.message ?? fieldError(state, n);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Acronym" htmlFor="acronym" error={err("acronym")}>
          <Input id="acronym" readOnly={!canRename} {...register("acronym")} />
        </Field>
        <Field label="Full name" htmlFor="name" error={err("name")} className="sm:col-span-2">
          <Input
            id="name"
            readOnly={!canRename}
            {...register("name", { onBlur: () => { if (!committee && !getValues("slug")) setValue("slug", slugify(getValues("acronym") || getValues("name"))); } })}
          />
        </Field>
        <Field label="Slug" htmlFor="slug" error={err("slug")} hint="Used in the address: /committees/slug">
          <Input id="slug" readOnly={!canRename} {...register("slug")} />
        </Field>
        <Field label="Category" htmlFor="category" error={err("category")} className="sm:col-span-2">
          <Input id="category" list="categories" readOnly={!canRename} {...register("category")} />
          <datalist id="categories">
            {["General Assembly", "Security Council", "Specialised Agency", "Humanitarian", "Court", "Historical Crisis", "Regional Body"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Description" htmlFor="description" optional error={err("description")}>
        <Textarea id="description" rows={3} {...register("description")} />
      </Field>
      <Field label="Current topic" htmlFor="current_topic" optional error={err("current_topic")}>
        <Input id="current_topic" {...register("current_topic")} />
      </Field>
      <Field label="Background guide link" htmlFor="background_guide_url" optional error={err("background_guide_url")}>
        <Input id="background_guide_url" type="url" placeholder="https://" {...register("background_guide_url")} />
      </Field>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="is_open" name="is_open" defaultChecked={committee?.is_open ?? true} />
          <Label htmlFor="is_open">Open to new delegates</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="submissions_enabled" name="submissions_enabled" defaultChecked={committee?.submissions_enabled ?? true} />
          <Label htmlFor="submissions_enabled">Accept position-paper submissions</Label>
        </div>
      </div>
      <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {committee ? "Save changes" : "Create committee"}
        </Button>
      </div>
    </form>
  );
}
