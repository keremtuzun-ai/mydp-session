import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/types/database";

type Status = Enums<"session_status">;
const LABEL: Record<Status, string> = { draft: "Draft", published: "Scheduled", completed: "Completed", cancelled: "Cancelled" };
const VARIANT: Record<Status, "muted" | "gold" | "success" | "destructive"> = {
  draft: "muted",
  published: "gold",
  completed: "success",
  cancelled: "destructive",
};

export function SessionStatusBadge({ status }: { status: Status }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}

export function AttendanceBadge({ status }: { status: Enums<"attendance_status"> | null | undefined }) {
  if (!status) return <Badge variant="outline">Not recorded</Badge>;
  const variant = status === "present" ? "success" : status === "late" ? "warning" : status === "excused" ? "info" : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}
