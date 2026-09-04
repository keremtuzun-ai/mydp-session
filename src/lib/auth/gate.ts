/**
 * Pure routing rules for the authentication / onboarding gate. Used by
 * proxy.ts, the app layout and the onboarding page so all three agree, and
 * unit-tested in isolation.
 */
export type GateUser = { id: string; email: string | null; emailConfirmed: boolean } | null;
export type GateProfile = { onboardingCompletedAt: string | null } | null;

export const PUBLIC_PATHS = ["/", "/login", "/welcome", "/reset-password", "/auth"];
export const ONBOARDING_PATH = "/onboarding";

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type GateDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string; reason: "unauthenticated" | "needs-onboarding" | "already-onboarded" | "already-signed-in" };

export function decideGate(pathname: string, user: GateUser, profile: GateProfile): GateDecision {
  const publicPath = isPublicPath(pathname);
  const onboardingPath = pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
  const onboarded = Boolean(profile?.onboardingCompletedAt);

  if (!user) {
    if (publicPath) return { kind: "allow" };
    const next = encodeURIComponent(pathname);
    return { kind: "redirect", to: `/login?next=${next}`, reason: "unauthenticated" };
  }

  // Signed in but profile incomplete: the only place they may go is onboarding
  // (plus auth utility routes such as sign-out).
  if (!onboarded) {
    if (onboardingPath || pathname.startsWith("/auth/")) return { kind: "allow" };
    return { kind: "redirect", to: ONBOARDING_PATH, reason: "needs-onboarding" };
  }

  if (onboardingPath) return { kind: "redirect", to: "/dashboard", reason: "already-onboarded" };
  if (pathname === "/login" || pathname === "/welcome" || pathname === "/verify") {
    return { kind: "redirect", to: "/dashboard", reason: "already-signed-in" };
  }
  return { kind: "allow" };
}
