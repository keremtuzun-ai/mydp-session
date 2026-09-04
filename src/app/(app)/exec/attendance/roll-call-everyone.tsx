"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { bulkRecordAttendance } from "@/actions/attendance";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"attendance_status">;
const STATUSES: Status[] = ["present", "absent", "excused"];
const TONE: Record<string, string> = {
  present: "data-[on=true]:!bg-[var(--success-soft)] data-[on=true]:!border-[var(--success)] data-[on=true]:!text-[var(--success)]",
  absent: "data-[on=true]:!bg-[var(--danger-soft)] data-[on=true]:!border-[var(--danger)] data-[on=true]:!text-[var(--danger)]",
  excused: "data-[on=true]:!bg-[var(--navy-soft)] data-[on=true]:!border-[var(--navy)] data-[on=true]:!text-[var(--navy)]",
};

type Member = { profileId: string; name: string; role: string; status: Status | null; note: string | null };

export function SessionPicker({ sessions, selected, basePath }: { sessions: { id: string; title: string; starts_at: string }[]; selected: string; basePath: string }) {
  const router = useRouter();
  return (
    <div className="sm:w-80">
      <Label htmlFor="session-pick" className="mb-1 block">
        Session
      </Label>
      <NativeSelect id="session-pick" value={selected} onChange={(e) => router.push(`${basePath}?session=${e.target.value}`)}>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} · {new Date(s.starts_at).toLocaleDateString()}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function RollCallEveryone({ sessionId, members }: { sessionId: string; members: Member[] }) {
  const [rows, setRows] = useState<Record<string, { status: Status | null; note: string }>>(() => Object.fromEntries(members.map((m) => [m.profileId, { status: m.status, note: m.note ?? "" }])));
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = members.some((m) => rows[m.profileId]?.status !== m.status || (rows[m.profileId]?.note ?? "") !== (m.note ?? ""));

  const save = () =>
    startTransition(async () => {
      const entries = members.filter((m) => rows[m.profileId]?.status).map((m) => ({ profile_id: m.profileId, status: rows[m.profileId]!.status as Status, note: rows[m.profileId]!.note || undefined }));
      if (!entries.length) return void toast.error("Mark at least one member first.");
      const result = await bulkRecordAttendance({ session_id: sessionId, entries });
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else toast.error(result.error);
    });

  const markAll = (status: Status) => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, status }])));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => markAll("present")}>
          Everyone present
        </Button>
        <Button size="sm" onClick={save} loading={pending} disabled={!dirty}>
          Save attendance
        </Button>
      </div>
      <ul className="ledger mt-3 list-none p-0">
        {members.map((m) => (
          <li key={m.profileId} className="grid gap-2 sm:grid-cols-[1fr_auto_minmax(0,14rem)] sm:items-center !py-3 hover:!bg-transparent">
            <div>
              <p className="m-0 font-[650]">{m.name}</p>
              {m.role !== "delegate" ? <p className="m-0 row-sub">{m.role}</p> : null}
            </div>
            <div role="radiogroup" aria-label={`Attendance for ${m.name}`} className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={rows[m.profileId]?.status === s} data-on={rows[m.profileId]?.status === s} onClick={() => setRows((r) => ({ ...r, [m.profileId]: { ...r[m.profileId]!, status: s } }))} className={cn("filter-pill", TONE[s])}>
                  {s}
                </button>
              ))}
            </div>
            <Input aria-label={`Note for ${m.name}`} placeholder="Note (optional)" value={rows[m.profileId]?.note ?? ""} onChange={(e) => setRows((r) => ({ ...r, [m.profileId]: { ...r[m.profileId]!, note: e.target.value } }))} className="!py-1.5 !text-[0.82rem]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
