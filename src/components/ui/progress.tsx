import { cn } from "@/lib/utils";

export function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-paper-2 border border-line-soft", className)}>
      <div className="h-full bg-navy transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}
