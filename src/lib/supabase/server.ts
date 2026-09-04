import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

/**
 * Per-request Supabase client that acts AS THE SIGNED-IN USER. Every query
 * made through it is subject to Row Level Security. This is the client that
 * all pages and server actions should use for reads and writes.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are refreshed by proxy.ts instead.
          }
        },
      },
    },
  );
}

/**
 * Client used ONLY to request emailed links and codes. It uses the implicit
 * flow so the link Supabase mails works from any device or mail app: the
 * verified session comes back in the URL fragment and /auth/callback stores
 * it, instead of needing a PKCE verifier cookie from the original browser.
 */
export async function createOtpClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { flowType: "implicit" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
}
