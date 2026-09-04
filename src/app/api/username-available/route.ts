import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/auth/username";

/** Live username check during onboarding. Requires a verified session. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email_confirmed_at) return NextResponse.json({ error: "Verify your email first" }, { status: 401 });

  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ available: false, reason: parsed.error.issues[0]?.message ?? "Invalid username" });
  const { data, error } = await supabase.rpc("username_available", { p_username: parsed.data });
  if (error) return NextResponse.json({ error: "Could not check right now" }, { status: 500 });
  return NextResponse.json({ available: Boolean(data), reason: data ? null : "That username is already taken" }, { headers: { "cache-control": "no-store" } });
}
