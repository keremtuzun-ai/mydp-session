import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedSchoolEmail } from "@/lib/auth/domains";

/**
 * Landing point for emailed links: PKCE `code` (magic link / recovery) or
 * `token_hash` + `type` (custom templates). After exchanging, the domain is
 * re-checked and the user is routed to onboarding, the reset page, or `next`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(new URL("/login?error=link", url.origin));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedSchoolEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=domain", url.origin));
  }
  if (type === "recovery" || next.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password/update", url.origin));
  }
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile?.onboarding_completed_at ? next : "/onboarding", url.origin));
}
