import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL, MEMBERSHIP_LABEL, type UserRole, type MembershipRole } from "@/lib/auth/roles";

const ROLE_VARIANT: Record<UserRole, "gold" | "navy" | "info" | "muted"> = {
  admin: "gold",
  executive: "navy",
  chair: "info",
  delegate: "muted",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <Badge variant={ROLE_VARIANT[role]} className={className}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function MembershipBadge({ role, className }: { role: MembershipRole; className?: string }) {
  const variant = role === "chair" || role === "co_chair" ? "info" : role === "executive" ? "navy" : "muted";
  return (
    <Badge variant={variant} className={className}>
      {MEMBERSHIP_LABEL[role]}
    </Badge>
  );
}
