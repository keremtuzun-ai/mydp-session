import type { LucideIcon } from "lucide-react";

export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="tally-block">
      <div className="tally-label">{label}</div>
      <div className="tally-number mt-1">{value}</div>
      {hint ? <div className="muted small mt-0.5">{hint}</div> : null}
    </div>
  );
}
