import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"task_status">;

export const TASK_STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  reviewed: "Returned",
  completed: "Completed",
  overdue: "Overdue",
};

const VARIANT: Record<Status, "muted" | "info" | "warning" | "gold" | "success" | "destructive"> = {
  not_started: "muted",
  in_progress: "info",
  submitted: "warning",
  reviewed: "gold",
  completed: "success",
  overdue: "destructive",
};

export function TaskStatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}
