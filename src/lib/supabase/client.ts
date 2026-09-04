"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { sessionOnly } from "@/lib/supabase/cookies";

export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return document.cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => {
            const i = c.indexOf("=");
            return { name: decodeURIComponent(c.slice(0, i)), value: decodeURIComponent(c.slice(i + 1)) };
          });
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          const o = sessionOnly(options ?? {});
          let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${o.path ?? "/"}; samesite=${String(o.sameSite ?? "lax")}`;
          if (o.secure) str += "; secure";
          if (value === "") str += "; max-age=0";
          document.cookie = str;
        }
      },
    },
  });
}
