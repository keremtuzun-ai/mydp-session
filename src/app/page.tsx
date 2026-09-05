import Link from "next/link";
import { Brand, BrandLogo } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { appName, schoolName } from "@/lib/env";
import { fmt, zonedNow, zonedInstant } from "@/lib/utils";
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

export default function LandingPage() {
  const next = nextSessionStart();
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
      <main className="main-area">
        <div className="main-inner">
          <section className="front-hero">
            <div>
              <p className="front-hero-kicker">{schoolName} · Model United Nations</p>
              <h1 className="front-hero-title">
                The weekly <span className="accent-line">session</span> hub.
              </h1>
              <p className="front-hero-standfirst">Sessions, tasks, materials and announcements for the Koç MUN Club.</p>
              <div className="front-hero-actions">
                <Link href="/welcome" className="btn btn-lg">
                  Create account
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Already have an account
                </Link>
              </div>
            </div>
            <div className="front-hero-logo"><BrandLogo height={110} className="w-full" /></div>
          </section>

          <section className="front-countdown">
            <p className="countdown-label">Next weekly session · {fmt(next, "EEEE d MMMM, HH:mm")}</p>
            <Countdown target={next.toISOString()} />
          </section>
        </div>
      </main>
      <footer className="main-inner !pt-0 !pb-8 flex items-center justify-between label-caps">
        <span>{appName}</span>
        <span>School accounts only</span>
      </footer>
    </>
  );
}
