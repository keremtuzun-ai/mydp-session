import type { Enums } from "@/lib/types/database";

export type UserRole = Enums<"user_role">;
export type MembershipRole = Enums<"membership_role">;

export const USER_ROLES: UserRole[] = ["admin", "executive", "chair", "delegate"];
export const MEMBERSHIP_ROLES: MembershipRole[] = ["delegate", "chair", "co_chair", "executive"];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  executive: "Executive",
  chair: "Chair",
  delegate: "Delegate",
};

export const MEMBERSHIP_LABEL: Record<MembershipRole, string> = {
  delegate: "Delegate",
  chair: "Chair",
  co_chair: "Co-Chair",
  executive: "Executive",
};

export function isStaffRole(role: UserRole | null | undefined) {
  return role === "admin" || role === "executive";
}

export function isChairMembership(role: MembershipRole) {
  return role === "chair" || role === "co_chair";
}
