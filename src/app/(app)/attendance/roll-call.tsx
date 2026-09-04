"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { CommitteeSeal } from "@/components/mun/committee-badge";
import { bulkRecordAttendance } from "@/actions/attendance";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"attendance_status">;
const STATUSES: Status[] = ["present", "late", "excused", "absent"];
const TONE: Record<Status, string> = {
  present: "data-[on=true]:bg-success/20 data-[on=true]:border-success data-[on=true]:text-success",
  late: "data-[on=true]:bg-warning/25 data-[on=true]:border-warning",
  excused: "data-[on=true]:bg-info/20 data-[on=true]:border-info data-[on=true]:text-info",
  absent: "data-[on=true]:bg-destructive/15 data-[on=true]:border-destructive data-[on=true]:text-destructive",
};

type Member = { profileId: string; name: string; delegation: string | null; status: Status | null; note: string | null };

export function SessionPicker({ sessions, selected }: { sessions: { id: string; title: string; starts_at: string }[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="sm:w-80">
      <Label htmlFor="session-pick" className="mb-1 block text-xs text-muted-foreground">
        Session
      </Label>
      <NativeSelect id="session-pick" value={selected} onChange={(e) => router.push(`${pathname}?session=${e.target.value}`)}>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} · {new Date(s.starts_at).toLocaleDateString()}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function RollCall({ sessionId, committee }: { sessionId: string; committee: { committeeId: string; acronym: string; name: string; members: Member[] } }) {
  const [rows, setRows] = useState<Record<string, { status: Status | null; note: string }>>(() =>
    Object.fromEntries(committee.members.map((m) => [m.profileId, { status: m.status, note: m.note ?? "" }])),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = committee.members.some((m) => rows[m.profileId]?.status !== m.status || (rows[m.profileId]?.note ?? "") !== (m.note ?? ""));

  const save = () =>
    startTransition(async () => {
      const entries = committee.members
        .filter((m) => rows[m.profileId]?.status)
        .map((m) => ({ profile_id: m.profileId, status: rows[m.profileId]!.status as Status, note: rows[m.profileId]!.note || undefined }));
      if (!entries.length) {
        toast.error("Mark at least one member first.");
        return;
      }
      const result = await bulkRecordAttendance({ session_id: sessionId, entries });
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else toast.error(result.error);
    });

  const markAll = (status: Status) => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, status }])));

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CommitteeSeal acronym={committee.acronym} size="sm" />
          <div>
            <p className="font-semibold leading-tight">{committee.name}</p>
            <p className="text-xs text-muted-foreground">{committee.members.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => markAll("present")}>
            All present
          </Button>
          <Button size="sm" onClick={save} loading={pending} disabled={!dirty}>
            Save roll call
          </Button>
        </div>
      </div>
      <ul className="mt-4 divide-y">
        {committee.members.map((m) => (
          <li key={m.profileId} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_minmax(0,14rem)] sm:items-center">
            <div>
              <p className="font-medium leading-tight">{m.name}</p>
              {m.delegation ? <p className="text-xs text-muted-foreground">{m.delegation}</p> : null}
            </div>
            <div role="radiogroup" aria-label={`Attendance for ${m.name}`} className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={rows[m.profileId]?.status === s}
                  data-on={rows[m.profileId]?.status === s}
                  onClick={() => setRows((r) => ({ ...r, [m.profileId]: { ...r[m.profileId]!, status: s } }))}
                  className={cn("rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", TONE[s])}
                >
                  {s}
                </button>
              ))}
            </div>
            <Input
              aria-label={`Note for ${m.name}`}
              placeholder="Note (optional)"
              value={rows[m.profileId]?.note ?? ""}
              onChange={(e) => setRows((r) => ({ ...r, [m.profileId]: { ...r[m.profileId]!, note: e.target.value } }))}
              className="h-8 text-xs"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
