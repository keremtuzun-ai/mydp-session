import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedSchoolEmail } from "@/lib/auth/domains";

/**
 * Server-side half of the email landing: exchanges a PKCE `code` or a
 * `token_hash` + `type` (custom templates), re-checks the domain and routes to
 * onboarding, the reset page, or `next`. Fragment tokens from implicit-flow
 * links are handled by /auth/callback (a client page) which then comes here
 * with `?established=1`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = await createClient();
  let ok = url.searchParams.get("established") === "1";
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(new URL("/welcome?error=link", url.origin));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedSchoolEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/welcome?error=domain", url.origin));
  }
  if (type === "recovery" || url.searchParams.get("established_type") === "recovery" || next.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password/update", url.origin));
  }
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile?.onboarding_completed_at ? next : "/onboarding", url.origin));
}
