"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for every emailed link. Implicit-flow links carry the session
 * in the URL fragment (#access_token=…), which only the browser can read: it
 * is stored as cookies here, then the server route finishes the routing.
 * PKCE `code` links and `token_hash` links are forwarded to the same route.
 */
export default function AuthCallbackPage() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const next = url.searchParams.get("next") ?? "/dashboard";
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const forward = (params: Record<string, string>) => {
        const target = new URL("/auth/exchange", url.origin);
        target.searchParams.set("next", next);
        for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
        window.location.replace(target.toString());
      };

      const hashError = hash.get("error_description") ?? hash.get("error") ?? url.searchParams.get("error_description");
      if (hashError) {
        setMessage(decodeURIComponent(hashError.replace(/\+/g, " ")));
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          setMessage(error.message);
          return;
        }
        window.history.replaceState(null, "", url.pathname + url.search);
        forward({ established: "1", established_type: hash.get("type") ?? "" });
        return;
      }

      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (code) return forward({ code });
      if (tokenHash && type) return forward({ token_hash: tokenHash, type });
      setMessage("This link is missing its sign-in token. Request a new email and open the link from it.");
    };
    void run();
  }, []);

  return (
    <main className="main-area">
      <div className="main-inner main-inner-auth">
        <section className="auth-card" aria-live="polite">
          {message ? (
            <>
              <span className="page-kicker">Link problem</span>
              <h1>That link did not work</h1>
              <p className="muted">{message}</p>
              <div className="form-actions">
                <Link href="/welcome" className="btn">
                  Request a new email
                </Link>
                <Link href="/login" className="btn btn-outline">
                  Sign in instead
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="page-kicker">One moment</span>
              <h1>Signing you in…</h1>
              <p className="muted m-0">Verifying your school email and opening your account.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
