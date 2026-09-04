import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string };

/** The portal's "· · ·" empty state. The icon prop is accepted for call-site compatibility. */
export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div className={cn("empty-state", className)}>
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="small mt-1">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
