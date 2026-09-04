"use client";

import { useRouter, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = { scope: string; status: string };

export function SessionFilters({ scope, status }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ scope, status, ...patch });
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k);
    router.push(`${pathname}?${params.toString()}`);
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div role="tablist" aria-label="Time range" className="filter-pills">
        {(["upcoming", "past", "all"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={scope === s} onClick={() => update({ scope: s })} className={cn("filter-pill", scope === s && "active")}>
            {s}
          </button>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:max-w-xs">
        <div>
          <Label htmlFor="f-status" className="mb-1 block">
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
