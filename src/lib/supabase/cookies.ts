import type { CookieOptions } from "@supabase/ssr";

/**
 * Members must sign in again every time they open the site: auth cookies are
 * session cookies (no max-age / expires), so closing the browser ends the
 * session. Everything they did is in the database, nothing lives in the cookie.
 */
export function sessionOnly<T extends Partial<CookieOptions>>(options: T): T {
  const rest = { ...options } as T & { maxAge?: number; expires?: Date };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
