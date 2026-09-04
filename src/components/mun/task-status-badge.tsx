import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"task_status">;

export const TASK_STATUS_LABEL: Record<Status, string> = {
  not_started: "Open",
  in_progress: "In progress",
  submitted: "Submitted",
  reviewed: "Returned",
  completed: "Done",
  overdue: "Overdue",
};

const VARIANT: Record<Status, "navy" | "warning" | "gold" | "success" | "destructive" | "secondary"> = {
  not_started: "navy",
  in_progress: "navy",
  submitted: "warning",
  reviewed: "gold",
  completed: "success",
  overdue: "destructive",
};

export function TaskStatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant={VARIANT[status]} dot className={`${status === "in_progress" ? "chip-pulse" : ""} ${className ?? ""}`}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  );
}
