"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { TaskStatusBadge, TASK_STATUS_LABEL } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { relativeDue, formatDateTime, cn } from "@/lib/utils";
import type { Task } from "@/lib/types/database";

export type TaskRow = Task & { assignedByName: string; assigneeName: string; sessionTitle: string | null; committeeAcronym: string | null; uploadCount: number };

export function TaskList({ rows, scope, status, showScope }: { rows: TaskRow[]; scope: string; status: string; showScope: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ scope, status, ...patch });
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {showScope ? (
          <div role="tablist" aria-label="Scope" className="inline-flex rounded-md border bg-card p-0.5">
            {[
              ["mine", "Mine"],
              ["managed", "I manage"],
              ["all", "All visible"],
            ].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={scope === v} onClick={() => update({ scope: v! })} className={cn("rounded px-3 py-1.5 text-sm", scope === v ? "bg-navy text-primary-foreground dark:bg-gold dark:text-navy-deep" : "text-muted-foreground hover:bg-accent")}>
                {l}
              </button>
            ))}
          </div>
        ) : null}
        <div className="sm:w-56">
          <Label htmlFor="f-status" className="mb-1 block text-xs text-muted-foreground">
            Status
          </Label>
          <NativeSelect id="f-status" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Any status</option>
            {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {rows.length ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Committee</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned by</TableHead>
                  <TableHead className="text-right">Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/calendar/${t.id}`} className="font-medium underline-offset-4 hover:underline">
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.assigneeName}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.sessionTitle ?? "—"}</TableCell>
                    <TableCell>{t.committeeAcronym ? <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{t.committeeAcronym}</span> : "—"}</TableCell>
                    <TableCell>
                      <span title={formatDateTime(t.due_at)}>{relativeDue(t.due_at)}</span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.assignedByName}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Paperclip className="size-3.5" aria-hidden /> {t.uploadCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/calendar/${t.id}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{t.title}</p>
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.assigneeName}
                      {t.committeeAcronym ? ` · ${t.committeeAcronym}` : ""}
                      {t.sessionTitle ? ` · ${t.sessionTitle}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <PriorityBadge priority={t.priority} />
                      <span>{relativeDue(t.due_at)}</span>
                      <span className="ml-auto inline-flex items-center gap-1">
                        <Paperclip className="size-3.5" aria-hidden /> {t.uploadCount}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
