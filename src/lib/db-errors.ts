import type { PostgrestError } from "@supabase/supabase-js";

/** Turn database / storage errors into messages a member can act on. */
export function describeDbError(error: PostgrestError | { message: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const code = "code" in error ? error.code : undefined;
  const msg = error.message ?? "";
  if (code === "42501" || /row-level security|permission denied|not permitted|may only|cannot/i.test(msg)) {
    // Trigger messages are written for humans; RLS denials are not.
    return /row-level security|permission denied/i.test(msg) ? "You do not have permission to do that." : msg;
  }
  if (code === "23505") return "That value is already taken.";
  if (code === "23503") return "That record refers to something that no longer exists.";
  if (code === "23514") return msg.includes("Onboarding") ? msg : "The data did not pass validation.";
  if (code === "PGRST116") return "Not found.";
  return msg || fallback;
}
