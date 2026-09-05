/**
 * Pure, side-effect-free authorization rules. These mirror the SQL policies in
 * supabase/migrations/0002_rls.sql and are the single place server actions
 * consult before touching the database. The database still enforces RLS on
 * its own; this layer gives clear error messages and unit-testable rules.
 */
import type { Task, Committee } from "@/lib/types/database";
import type { UserRole } from "@/lib/auth/roles";

export type Actor = {
  id: string;
  role: UserRole;
  chairedCommitteeIds: readonly string[];
  memberCommitteeIds: readonly string[];
};

export const isAdmin = (a: Actor) => a.role === "admin";
export const isStaff = (a: Actor) => a.role === "admin" || a.role === "executive";
export const chairs = (a: Actor, committeeId: string | null | undefined) =>
  Boolean(committeeId) && a.chairedCommitteeIds.includes(committeeId as string);
export const memberOf = (a: Actor, committeeId: string | null | undefined) =>
  Boolean(committeeId) && a.memberCommitteeIds.includes(committeeId as string);

type TaskLike = Pick<Task, "assigned_to_profile_id" | "assigned_role" | "assigned_committee_id" | "created_by">;

export function canViewTask(a: Actor, t: TaskLike): boolean {
  if (isStaff(a)) return true;
  if (t.assigned_to_profile_id === a.id) return true;
  if (t.created_by === a.id) return true;
  if (chairs(a, t.assigned_committee_id)) return true;
  if (t.assigned_to_profile_id === null) {
    if (t.assigned_role !== null) {
      return t.assigned_role === a.role && (t.assigned_committee_id === null || memberOf(a, t.assigned_committee_id));
    }
    if (t.assigned_committee_id !== null) return memberOf(a, t.assigned_committee_id);
  }
  return false;
}

/** Review / return / complete / reopen / edit / delete. */
export function canManageTask(a: Actor, t: Pick<Task, "assigned_committee_id">): boolean {
  if (isStaff(a)) return true;
  return chairs(a, t.assigned_committee_id);
}

/** Creating a task scoped to a committee (or globally for staff). */
export function canCreateTask(a: Actor, committeeId: string | null): boolean {
  if (isStaff(a)) return true;
  return chairs(a, committeeId);
}

export const DELEGATE_STATUSES = ["not_started", "in_progress", "submitted", "completed"] as const;
export type DelegateStatus = (typeof DELEGATE_STATUSES)[number];

export function canDelegateSetStatus(a: Actor, t: TaskLike & Pick<Task, "status">, next: string): boolean {
  if (t.assigned_to_profile_id !== a.id) return false;
  if (t.status === "reviewed") return false;
  return (DELEGATE_STATUSES as readonly string[]).includes(next);
}

/** Every member may submit work on any task. */
export function canUploadEvidence(a: Actor, t: TaskLike & Pick<Task, "status">): boolean {
  void a;
  void t;
  return true;
}

export function canManageCommittee(a: Actor, committeeId: string): boolean {
  return isStaff(a) || chairs(a, committeeId);
}

export function canManageSessions(a: Actor): boolean {
  return isStaff(a);
}

export function canRecordAttendance(a: Actor, memberCommitteeIdsOfSubject: readonly string[]): boolean {
  if (isStaff(a)) return true;
  return memberCommitteeIdsOfSubject.some((c) => chairs(a, c));
}

export function canPostAnnouncement(a: Actor, targetCommitteeId: string | null): boolean {
  if (isStaff(a)) return true;
  return chairs(a, targetCommitteeId);
}

export function canUploadMaterial(a: Actor, committeeId: string | null): boolean {
  if (isStaff(a)) return true;
  return chairs(a, committeeId);
}

export function canSubmitToCommittee(a: Actor, c: Pick<Committee, "id" | "submissions_enabled">): boolean {
  return c.submissions_enabled && memberOf(a, c.id);
}

/** Sharing a resolution document with a committee: members, its chairs and staff. */
export function canPostResolution(a: Actor, committeeId: string): boolean {
  return isStaff(a) || chairs(a, committeeId) || memberOf(a, committeeId);
}

export function canManageResolution(a: Actor, r: { profile_id: string; committee_id: string }): boolean {
  return r.profile_id === a.id || isStaff(a) || chairs(a, r.committee_id);
}

export class PermissionError extends Error {
  readonly code = "PERMISSION_DENIED";
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertCan(ok: boolean, message?: string): asserts ok {
  if (!ok) throw new PermissionError(message);
}
