import { describe, expect, it } from "vitest";
import {
  canViewTask, canManageTask, canCreateTask, canDelegateSetStatus, canUploadEvidence, canRecordAttendance,
  canPostAnnouncement, canManageCommittee, canSubmitToCommittee, type Actor,
} from "@/lib/policy";

const UNSC = "c-unsc";
const WHO = "c-who";

const admin: Actor = { id: "admin", role: "admin", chairedCommitteeIds: [], memberCommitteeIds: [] };
const exec: Actor = { id: "exec", role: "executive", chairedCommitteeIds: [], memberCommitteeIds: [] };
const unscChair: Actor = { id: "chair-unsc", role: "chair", chairedCommitteeIds: [UNSC], memberCommitteeIds: [UNSC] };
const whoChair: Actor = { id: "chair-who", role: "chair", chairedCommitteeIds: [WHO], memberCommitteeIds: [WHO] };
const ayse: Actor = { id: "ayse", role: "delegate", chairedCommitteeIds: [], memberCommitteeIds: [UNSC] };
const mehmet: Actor = { id: "mehmet", role: "delegate", chairedCommitteeIds: [], memberCommitteeIds: [UNSC] };
const zeynep: Actor = { id: "zeynep", role: "delegate", chairedCommitteeIds: [], memberCommitteeIds: [WHO] };

const aysesTask = { assigned_to_profile_id: "ayse", assigned_role: null, assigned_committee_id: UNSC, created_by: "chair-unsc", status: "in_progress" as const };
const whoTask = { assigned_to_profile_id: "zeynep", assigned_role: null, assigned_committee_id: WHO, created_by: "chair-who", status: "not_started" as const };
const unscBroadcast = { assigned_to_profile_id: null, assigned_role: null, assigned_committee_id: UNSC, created_by: "chair-unsc", status: "not_started" as const };
const allDelegates = { assigned_to_profile_id: null, assigned_role: "delegate" as const, assigned_committee_id: null, created_by: "exec", status: "not_started" as const };

describe("delegate task visibility", () => {
  it("a delegate cannot access another delegate's task", () => {
    expect(canViewTask(ayse, aysesTask)).toBe(true);
    expect(canViewTask(mehmet, aysesTask)).toBe(false);
    expect(canViewTask(zeynep, aysesTask)).toBe(false);
  });
  it("committee-wide and role-wide tasks are visible to the right people only", () => {
    expect(canViewTask(ayse, unscBroadcast)).toBe(true);
    expect(canViewTask(zeynep, unscBroadcast)).toBe(false);
    expect(canViewTask(zeynep, allDelegates)).toBe(true);
    expect(canViewTask(unscChair, allDelegates)).toBe(false);
  });
  it("delegates may only move their own task through the open statuses", () => {
    expect(canDelegateSetStatus(ayse, aysesTask, "submitted")).toBe(true);
    expect(canDelegateSetStatus(ayse, aysesTask, "completed")).toBe(false);
    expect(canDelegateSetStatus(ayse, aysesTask, "reviewed")).toBe(false);
    expect(canDelegateSetStatus(mehmet, aysesTask, "in_progress")).toBe(false);
    expect(canDelegateSetStatus(ayse, { ...aysesTask, status: "completed" }, "in_progress")).toBe(false);
  });
});

describe("chair scope", () => {
  it("a chair cannot modify another committee's tasks", () => {
    expect(canManageTask(unscChair, aysesTask)).toBe(true);
    expect(canManageTask(unscChair, whoTask)).toBe(false);
    expect(canManageTask(whoChair, aysesTask)).toBe(false);
    expect(canCreateTask(unscChair, WHO)).toBe(false);
    expect(canCreateTask(unscChair, UNSC)).toBe(true);
    expect(canCreateTask(unscChair, null)).toBe(false);
  });
  it("a chair sees tasks in their committee but not elsewhere", () => {
    expect(canViewTask(unscChair, aysesTask)).toBe(true);
    expect(canViewTask(unscChair, whoTask)).toBe(false);
  });
  it("chairs manage only their own committee, attendance and announcements", () => {
    expect(canManageCommittee(unscChair, UNSC)).toBe(true);
    expect(canManageCommittee(unscChair, WHO)).toBe(false);
    expect(canRecordAttendance(unscChair, [UNSC])).toBe(true);
    expect(canRecordAttendance(unscChair, [WHO])).toBe(false);
    expect(canPostAnnouncement(unscChair, UNSC)).toBe(true);
    expect(canPostAnnouncement(unscChair, null)).toBe(false);
    expect(canPostAnnouncement(unscChair, WHO)).toBe(false);
  });
});

describe("admin and executive access", () => {
  it("admin can view and manage everything", () => {
    for (const t of [aysesTask, whoTask, unscBroadcast, allDelegates]) {
      expect(canViewTask(admin, t)).toBe(true);
      expect(canManageTask(admin, t)).toBe(true);
    }
    expect(canCreateTask(admin, null)).toBe(true);
    expect(canManageCommittee(admin, WHO)).toBe(true);
    expect(canRecordAttendance(admin, [])).toBe(true);
    expect(canPostAnnouncement(admin, null)).toBe(true);
  });
  it("executives have the same operational reach", () => {
    expect(canManageTask(exec, whoTask)).toBe(true);
    expect(canCreateTask(exec, null)).toBe(true);
    expect(canManageCommittee(exec, UNSC)).toBe(true);
  });
});

describe("task upload permissions", () => {
  it("only the assignee (while open) and managers may upload evidence", () => {
    expect(canUploadEvidence(ayse, aysesTask)).toBe(true);
    expect(canUploadEvidence(mehmet, aysesTask)).toBe(false);
    expect(canUploadEvidence(zeynep, aysesTask)).toBe(false);
    expect(canUploadEvidence(unscChair, aysesTask)).toBe(true);
    expect(canUploadEvidence(whoChair, aysesTask)).toBe(false);
    expect(canUploadEvidence(admin, aysesTask)).toBe(true);
  });
  it("uploads close once a chair has reviewed or completed the task", () => {
    expect(canUploadEvidence(ayse, { ...aysesTask, status: "reviewed" })).toBe(false);
    expect(canUploadEvidence(ayse, { ...aysesTask, status: "completed" })).toBe(false);
    expect(canUploadEvidence(unscChair, { ...aysesTask, status: "completed" })).toBe(true);
  });
  it("committee submissions require membership and an open window", () => {
    expect(canSubmitToCommittee(ayse, { id: UNSC, submissions_enabled: true })).toBe(true);
    expect(canSubmitToCommittee(zeynep, { id: UNSC, submissions_enabled: true })).toBe(false);
    expect(canSubmitToCommittee(ayse, { id: UNSC, submissions_enabled: false })).toBe(false);
  });
});
