import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";
import { decideGate } from "@/lib/auth/gate";

/**
 * Runs before every non-static request: refreshes the Supabase session cookie
 * and applies the authentication / onboarding gate. Pages re-check on the
 * server as well (see lib/auth/session.ts); this is the first line, not the
 * only one.
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await refreshSession(request);
  const pathname = request.nextUrl.pathname;

  let profile: { onboardingCompletedAt: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ? { onboardingCompletedAt: data.onboarding_completed_at } : null;
  }

  const decision = decideGate(
    pathname,
    user ? { id: user.id, email: user.email ?? null, emailConfirmed: Boolean(user.email_confirmed_at) } : null,
    profile,
  );

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    const [path, query] = decision.to.split("?");
    url.pathname = path ?? "/";
    url.search = query ? `?${query}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
