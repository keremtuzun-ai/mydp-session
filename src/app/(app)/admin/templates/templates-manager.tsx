"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { EmptyState } from "@/components/mun/empty-state";
import { createTaskTemplate, deleteTaskTemplate } from "@/actions/admin";
import { assignFromTemplate } from "@/actions/tasks";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import type { TaskTemplate } from "@/lib/types/database";

type Member = { id: string; committee_id: string; name: string };

export function TemplatesManager({ templates, committees, sessions, members }: { templates: TaskTemplate[]; committees: { id: string; acronym: string }[]; sessions: { id: string; title: string }[]; members: Member[] }) {
  const [state, action] = useActionState(createTaskTemplate, null);
  useActionFeedback(state);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [committeeId, setCommitteeId] = useState(committees[0]?.id ?? "");
  void setCommitteeId;
  const [sessionId, setSessionId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const eligible = Array.from(new Map(members.filter((m) => !committeeId || m.committee_id === committeeId).map((m) => [m.id, m])).values());

  const assign = () =>
    startTransition(async () => {
      const result = await assignFromTemplate({ templateId, assigneeIds: Array.from(selected), committeeId: committeeId || null, sessionId: sessionId || null });
      if (result.ok) {
        toast.success(result.message);
        setSelected(new Set());
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="section-head"><h2>Templates</h2></div>
        {templates.length ? (
          <ul className="ledger">
            {templates.map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-[650]">{t.title}</p>
                  {t.description ? <p className="m-0 small muted">{t.description}</p> : null}
                  <p className="m-0 mt-1 dateline">Due {t.default_due_days} day{t.default_due_days === 1 ? "" : "s"} after assignment</p>
                </div>
                <PriorityBadge priority={t.priority} />
                <ActionButton size="icon" variant="ghost" aria-label={`Delete ${t.title}`} action={() => deleteTaskTemplate(t.id)} confirm={{ title: `Delete template “${t.title}”?`, description: "Tasks already assigned from it are not affected.", confirmLabel: "Delete" }}>
                  <Trash2 className="size-4" aria-hidden />
                </ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No templates yet" className="empty-state-sm" />
        )}
        <Card className="card-tight">
          <form action={action} className="flex flex-col gap-3">
            <span className="section-label m-0">New template</span>
            <Field label="Title" htmlFor="t-title">
              <Input id="t-title" name="title" required />
            </Field>
            <Field label="Instructions" htmlFor="t-desc" optional>
              <Textarea id="t-desc" name="description" rows={2} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority" htmlFor="t-priority">
                <NativeSelect id="t-priority" name="priority" defaultValue="normal">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </NativeSelect>
              </Field>
              <Field label="Due after (days)" htmlFor="t-days">
                <Input id="t-days" name="default_due_days" type="number" min={0} max={365} defaultValue={7} />
              </Field>
            </div>
            <FormError message={state && !state.ok ? state.error : null} />
            <div className="form-actions justify-end">
              <SubmitButton size="sm">Save template</SubmitButton>
            </div>
          </form>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="section-head"><h2>Assign from a template</h2></div>
        <Card className="card-tight flex flex-col gap-3">
          <Field label="Template" htmlFor="as-template">
            <NativeSelect id="as-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Session" htmlFor="as-session" optional>
              <NativeSelect id="as-session" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                <option value="">None</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 flex w-full items-center justify-between section-label">
              Delegates
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set(selected.size === eligible.length ? [] : eligible.map((m) => m.id)))}>
                {selected.size === eligible.length && eligible.length ? "Clear" : "Select all"}
              </Button>
            </legend>
            {eligible.length ? (
              <ul className="grid gap-1 sm:grid-cols-2">
                {eligible.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-[7px] border border-line bg-surface px-2 py-1.5">
                    <Checkbox
                      id={`m-${m.id}`}
                      checked={selected.has(m.id)}
                      onCheckedChange={(v) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (v) n.add(m.id);
                          else n.delete(m.id);
                          return n;
                        })
                      }
                    />
                    <Label htmlFor={`m-${m.id}`} className="cursor-pointer normal-case tracking-normal text-[0.88rem] font-medium text-ink">
                      {m.name}
                    </Label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 small muted">No delegates in this committee.</p>
            )}
          </fieldset>
          <div className="form-actions justify-end">
            <Button onClick={assign} loading={pending} disabled={!templateId || selected.size === 0}>
              Assign to {selected.size} delegate{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
