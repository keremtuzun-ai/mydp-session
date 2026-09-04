import { describe, expect, it } from "vitest";
import { usernameSchema, isValidUsernameFormat, RESERVED_USERNAMES } from "@/lib/auth/username";
import { onboardingSchema, signUpSchema } from "@/lib/validation/schemas";

describe("username rules", () => {
  it("accepts lowercase letters, numbers and hyphens between 3 and 24 chars", () => {
    for (const u of ["ayse", "mehmet-2028", "d3legate", "abc", "a".repeat(24)]) {
      expect(isValidUsernameFormat(u), u).toBe(true);
    }
  });

  it("rejects uppercase, spaces, symbols, wrong length and edge hyphens", () => {
    for (const u of ["Ayse", "ay se", "ayse!", "ab", "a".repeat(25), "-ayse", "ayse-", "ay_se", ""]) {
      expect(isValidUsernameFormat(u), u).toBe(false);
    }
  });

  it("rejects reserved names", () => {
    for (const u of RESERVED_USERNAMES) expect(isValidUsernameFormat(u), u).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(usernameSchema.parse("  ayse  ")).toBe("ayse");
  });

  it("onboarding cannot be completed with a bad username", () => {
    const base = { display_name: "Ayşe Demir", grade: "11", phone: "" };
    expect(onboardingSchema.safeParse({ ...base, username: "ayse-demir" }).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...base, username: "Ayse Demir" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, username: "" }).success).toBe(false);
  });

  it("sign-up requires a strong, confirmed password", () => {
    expect(signUpSchema.safeParse({ email: "a@school.edu", password: "Delegate2026", confirm_password: "Delegate2026" }).success).toBe(true);
    expect(signUpSchema.safeParse({ email: "a@school.edu", password: "Delegate2026", confirm_password: "other" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@school.edu", password: "short", confirm_password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "not-an-email", password: "Delegate2026", confirm_password: "Delegate2026" }).success).toBe(false);
  });
});
