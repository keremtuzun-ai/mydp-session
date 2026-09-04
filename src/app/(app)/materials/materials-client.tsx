"use client";

import { useActionState, useMemo, useState } from "react";
import { Download, FileText, Link2, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyState } from "@/components/mun/empty-state";
import { createMaterial, deleteMaterial } from "@/actions/materials";
import { useActionFeedback, fieldError } from "@/hooks/use-action-feedback";
import { MATERIAL_CATEGORIES } from "@/lib/validation/schemas";
import { formatBytes, formatDate, humanize } from "@/lib/utils";
import type { Material } from "@/lib/types/database";

type Item = Material & { uploaderName: string; canDelete: boolean };
type Ref = { id: string; acronym?: string; name?: string; title?: string };
type Filters = { committee: string; session: string; category: string; type: string; q: string };

function fileType(m: Material) {
  if (!m.storage_path) return "link";
  if (m.mime_type === "application/pdf") return "pdf";
  if (m.mime_type?.startsWith("image/")) return "image";
  if (m.mime_type?.startsWith("video/") || m.mime_type?.startsWith("audio/")) return "media";
  if (m.mime_type?.includes("presentation")) return "slides";
  return "document";
}

export function MaterialsBrowser({ items, committees, sessions, initial }: { items: Item[]; committees: Ref[]; sessions: Ref[]; initial: Filters }) {
  const [f, setF] = useState<Filters>(initial);
  const filtered = useMemo(
    () =>
      items.filter(
        (m) =>
          (!f.committee || m.committee_id === f.committee) &&
          (!f.session || m.session_id === f.session) &&
          (!f.category || m.category === f.category) &&
          (!f.type || fileType(m) === f.type) &&
          (!f.q || `${m.title} ${m.description ?? ""}`.toLowerCase().includes(f.q.toLowerCase())),
      ),
    [items, f],
  );
  const committeeName = (id: string | null) => committees.find((c) => c.id === id)?.acronym;
  const sessionName = (id: string | null) => sessions.find((s) => s.id === id)?.title;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label htmlFor="q" className="mb-1 block text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="q" className="pl-8" placeholder="Title or description" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="f-committee" className="mb-1 block text-xs text-muted-foreground">
            Committee
          </Label>
          <NativeSelect id="f-committee" value={f.committee} onChange={(e) => setF({ ...f, committee: e.target.value })}>
            <option value="">All</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="f-session" className="mb-1 block text-xs text-muted-foreground">
            Session
          </Label>
          <NativeSelect id="f-session" value={f.session} onChange={(e) => setF({ ...f, session: e.target.value })}>
            <option value="">All</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="f-category" className="mb-1 block text-xs text-muted-foreground">
              Category
            </Label>
            <NativeSelect id="f-category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="">All</option>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {humanize(c)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="f-type" className="mb-1 block text-xs text-muted-foreground">
              Type
            </Label>
            <NativeSelect id="f-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="">All</option>
              <option value="pdf">PDF</option>
              <option value="document">Document</option>
              <option value="slides">Slides</option>
              <option value="image">Image</option>
              <option value="media">Recording</option>
              <option value="link">Link</option>
            </NativeSelect>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    {m.storage_path ? <FileText className="size-5" aria-hidden /> : <Link2 className="size-5" aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {humanize(m.category)}
                      {committeeName(m.committee_id) ? ` · ${committeeName(m.committee_id)}` : ""}
                      {sessionName(m.session_id) ? ` · ${sessionName(m.session_id)}` : ""}
                    </p>
                  </div>
                  <Badge variant={m.visibility === "staff" ? "gold" : m.visibility === "committee" ? "info" : "muted"}>{m.visibility}</Badge>
                </div>
                {m.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.description}</p> : null}
                <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                  <span>
                    {m.uploaderName} · {formatDate(m.created_at)}
                    {m.size_bytes ? ` · ${formatBytes(m.size_bytes)}` : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/files/materials/${m.id}`} target="_blank" rel="noopener noreferrer">
                        <Download className="size-3.5" aria-hidden /> {m.storage_path ? "Download" : "Open"}
                      </a>
                    </Button>
                    {m.canDelete ? (
                      <ActionButton size="icon" variant="ghost" aria-label={`Delete ${m.title}`} action={() => deleteMaterial(m.id)} confirm={{ title: `Delete “${m.title}”?`, description: "The file will be removed for everyone.", confirmLabel: "Delete" }}>
                        <Trash2 className="size-4" aria-hidden />
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No materials match" description="Try a broader filter." className="py-8" />
      )}
    </div>
  );
}

export function NewMaterialDialog({ committees, sessions, isStaff }: { committees: Ref[]; sessions: Ref[]; isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createMaterial, null);
  useActionFeedback(state, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden /> Add material
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a material</DialogTitle>
          <DialogDescription>Attach a file or link a source. Committee-only materials are visible to that committee&apos;s members.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" encType="multipart/form-data">
          <Field label="Title" htmlFor="m-title" error={fieldError(state, "title")}>
            <Input id="m-title" name="title" required />
          </Field>
          <Field label="Description" htmlFor="m-desc" optional>
            <Textarea id="m-desc" name="description" rows={2} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="m-category">
              <NativeSelect id="m-category" name="category" defaultValue="study_guide">
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {humanize(c)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Visibility" htmlFor="m-visibility">
              <NativeSelect id="m-visibility" name="visibility" defaultValue={isStaff ? "everyone" : "committee"}>
                {isStaff ? <option value="everyone">Everyone</option> : null}
                <option value="committee">Committee members</option>
                {isStaff ? <option value="staff">Chairs and staff</option> : null}
              </NativeSelect>
            </Field>
            <Field label="Committee" htmlFor="m-committee" optional={isStaff}>
              <NativeSelect id="m-committee" name="committee_id" defaultValue={isStaff ? "" : committees[0]?.id ?? ""}>
                {isStaff ? <option value="">None</option> : null}
                {committees.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.acronym}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Session" htmlFor="m-session" optional>
              <NativeSelect id="m-session" name="session_id" defaultValue="">
                <option value="">None</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="File" htmlFor="m-file" optional hint="PDF, DOCX, PPTX, PNG, JPG, MP4 or MP3.">
            <Input id="m-file" name="file" type="file" />
          </Field>
          <Field label="Or a link" htmlFor="m-url" optional error={fieldError(state, "external_url")}>
            <Input id="m-url" name="external_url" type="url" placeholder="https://" />
          </Field>
          <FormError message={state && !state.ok && !state.fieldErrors ? state.error : null} />
          <div className="flex justify-end">
            <SubmitButton pendingText="Saving…">Add material</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
