"use client";

import { useEffect } from "react";

/**
 * Supabase may deliver a verified session (or an error) in the URL fragment
 * of whatever page it redirected to, including the site root when the
 * redirect path is not on the allow-list. Hand it to /auth/callback, which
 * knows how to store it.
 */
export function AuthHashForwarder() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || window.location.pathname.startsWith("/auth/callback")) return;
    if (/(^|[#&])(access_token|error|error_description)=/.test(hash)) {
      window.location.replace(`/auth/callback${hash}`);
    }
  }, []);
  return null;
}
