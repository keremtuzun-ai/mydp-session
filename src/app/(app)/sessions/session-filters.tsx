"use client";

import { useRouter, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = { scope: string; committee: string; status: string; committees: { id: string; acronym: string; name: string }[] };

export function SessionFilters({ scope, committee, status, committees }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ scope, committee, status, ...patch });
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div role="tablist" aria-label="Time range" className="inline-flex rounded-md border bg-card p-0.5">
        {(["upcoming", "past", "all"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => update({ scope: s })}
            className={cn("rounded px-3 py-1.5 text-sm capitalize", scope === s ? "bg-navy text-primary-foreground dark:bg-gold dark:text-navy-deep" : "text-muted-foreground hover:bg-accent")}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:max-w-md">
        <div>
          <Label htmlFor="f-committee" className="mb-1 block text-xs text-muted-foreground">
            Committee
          </Label>
          <NativeSelect id="f-committee" value={committee} onChange={(e) => update({ committee: e.target.value })}>
            <option value="">All committees</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor="f-status" className="mb-1 block text-xs text-muted-foreground">
            Status
          </Label>
          <NativeSelect id="f-status" value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="published">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
