import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role client. BYPASSES Row Level Security. Only import from
 * server-only modules, and only for the narrow set of operations that must
 * run above the user's own privileges (username → email lookup at sign-in,
 * signed download URLs after an RLS-checked read, audit logging, seeding).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  if (!cached) {
    cached = createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
