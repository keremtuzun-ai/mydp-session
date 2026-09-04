import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types/database";
import { Flame, ArrowUp, Minus, ArrowDown } from "lucide-react";

type Priority = Enums<"task_priority">;

export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };

const VARIANT: Record<Priority, "muted" | "outline" | "warning" | "destructive"> = {
  low: "muted",
  normal: "outline",
  high: "warning",
  urgent: "destructive",
};
const ICON: Record<Priority, typeof Flame> = { low: ArrowDown, normal: Minus, high: ArrowUp, urgent: Flame };

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const Icon = ICON[priority];
  return (
    <Badge variant={VARIANT[priority]} className={className}>
      <Icon className="size-3" aria-hidden />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
