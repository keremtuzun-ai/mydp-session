import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types/database";

type Priority = Enums<"task_priority">;

export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" };
const VARIANT: Record<Priority, "muted" | "secondary" | "gold" | "destructive"> = { low: "muted", normal: "secondary", high: "gold", urgent: "destructive" };

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge variant={VARIANT[priority]} dot className={className}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
