import Link from "next/link";
import { Brand, BrandLogo } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { appName, schoolName } from "@/lib/env";
import { fmt, zonedNow, zonedInstant } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUpcomingSessions } from "@/lib/data/rolling-sessions";
import { Countdown } from "./countdown";

/** Sessions meet every Tuesday at 10:55 and 15:10 (programme timezone). */
const SLOTS: [number, number][] = [
  [10, 55],
  [15, 10],
];
function nextSessionStart() {
  const z = zonedNow();
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(z.getFullYear(), z.getMonth(), z.getDate() + offset);
    if (day.getDay() !== 2) continue;
    for (const [h, m] of SLOTS) {
      const at = zonedInstant(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (at.getTime() > Date.now()) return at;
    }
  }
  return zonedInstant(z.getFullYear(), z.getMonth(), z.getDate() + 7, 10, 55);
}

async function nextPublishedSession(): Promise<Date | null> {
  try {
    const { data } = await createAdminClient().from("weekly_sessions").select("starts_at").eq("status", "published").gt("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle();
    return data ? new Date(data.starts_at) : null;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  await ensureUpcomingSessions();
  const next = (await nextPublishedSession()) ?? nextSessionStart();
  return (
    <>
      <header className="masthead masthead-auth">
        <div className="masthead-inner">
          <Brand />
          <div className="masthead-side">
            <div className="masthead-meta">
              <span>{fmt(new Date(), "EEEE, d MMMM yyyy")}</span>
              <br />
              <span className="masthead-user">{schoolName}</span>
            </div>
            <ThemeToggle />
            <Link href="/login" className="masthead-signout no-underline">
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <section className="front-band">
        <div className="front-band-inner">
          <div>
            <p className="front-hero-kicker">{schoolName} · Model United Nations</p>
            <h1 className="front-hero-title">
              Where the session <span className="accent-line">happens.</span>
            </h1>
            <div className="front-hero-actions">
              <Link href="/welcome" className="btn btn-cream btn-lg">
                Create account
              </Link>
              <Link href="/login" className="btn btn-cream-outline btn-lg">
                Sign in
              </Link>
            </div>
          </div>
          <div className="front-hero-logo"><BrandLogo height={150} wordmark={false} /></div>
        </div>
      </section>
      <main className="main-area">
        <div className="front-facts">
          <div className="front-fact">
            <p className="front-fact-label">When</p>
            <p className="front-fact-value">Every Tuesday, 10:55 and 15:10</p>
          </div>
          <div className="front-fact">
            <p className="front-fact-label">Where</p>
            <p className="front-fact-value">1S in the morning, the Library in the afternoon</p>
          </div>
          <div className="front-fact">
            <p className="front-fact-label">Next up</p>
            <p className="front-fact-value">{fmt(next, "EEEE d MMMM, HH:mm")}</p>
          </div>
        </div>
        <div className="main-inner">
          <section className="front-countdown">
            <p className="countdown-label">Countdown to the next session</p>
            <Countdown target={next.toISOString()} />
          </section>
        </div>
      </main>
      <footer className="front-foot label-caps">
        <span>{appName}</span>
        <span className="muted">{schoolName}</span>
      </footer>
    </>
  );
}
