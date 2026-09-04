import { describe, expect, it } from "vitest";
import { decideGate, isPublicPath } from "@/lib/auth/gate";

const verified = { id: "u1", email: "a@school.edu", emailConfirmed: true };
const incomplete = { onboardingCompletedAt: null };
const complete = { onboardingCompletedAt: "2026-09-01T10:00:00Z" };

describe("auth + onboarding gate", () => {
  it("lets signed-out visitors see only public pages", () => {
    expect(decideGate("/", null, null)).toEqual({ kind: "allow" });
    expect(decideGate("/login", null, null)).toEqual({ kind: "allow" });
    expect(decideGate("/dashboard", null, null)).toMatchObject({ kind: "redirect", to: "/login?next=%2Fdashboard" });
    expect(decideGate("/onboarding", null, null)).toMatchObject({ kind: "redirect", reason: "unauthenticated" });
  });

  it("onboarding cannot be skipped: verified users without a profile are forced to /onboarding", () => {
    for (const path of ["/dashboard", "/calendar", "/sessions/abc", "/admin", "/settings", "/"]) {
      expect(decideGate(path, verified, incomplete), path).toMatchObject({ kind: "redirect", to: "/onboarding", reason: "needs-onboarding" });
    }
    expect(decideGate("/onboarding", verified, incomplete)).toEqual({ kind: "allow" });
    expect(decideGate("/auth/signout", verified, incomplete)).toEqual({ kind: "allow" });
    // A missing profile row counts as incomplete
    expect(decideGate("/dashboard", verified, null)).toMatchObject({ kind: "redirect", to: "/onboarding" });
  });

  it("onboarded users cannot re-enter onboarding or the sign-in pages", () => {
    expect(decideGate("/onboarding", verified, complete)).toMatchObject({ kind: "redirect", to: "/dashboard", reason: "already-onboarded" });
    expect(decideGate("/login", verified, complete)).toMatchObject({ kind: "redirect", to: "/dashboard" });
    expect(decideGate("/dashboard", verified, complete)).toEqual({ kind: "allow" });
    expect(decideGate("/admin", verified, complete)).toEqual({ kind: "allow" }); // role is checked in the page, not the gate
  });

  it("recognises public prefixes", () => {
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/reset-password/update")).toBe(true);
    expect(isPublicPath("/sessions")).toBe(false);
  });
});
