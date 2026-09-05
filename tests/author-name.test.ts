import { describe, expect, it } from "vitest";
import { authorNameSchema, taskSchema } from "@/lib/validation/schemas";

describe("author name on published items", () => {
  it("needs a name and a surname", () => {
    expect(authorNameSchema.safeParse("Leyla Şahin").success).toBe(true);
    expect(authorNameSchema.safeParse("  Ayşe   Demir ").success).toBe(true);
    expect(authorNameSchema.safeParse("Leyla").success).toBe(false);
    expect(authorNameSchema.safeParse("").success).toBe(false);
  });
  it("is required when a task is created", () => {
    const base = { title: "Draft clause 2", description: "", committee_label: "", assigned_to_profile_id: "", assigned_role: "", assigned_committee_id: "", session_id: "", due_at: "", priority: "normal" };
    expect(taskSchema.safeParse({ ...base, author_name: "" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, author_name: "Leyla Şahin" }).success).toBe(true);
  });
});
