import Link from "next/link";
import { Brand, BrandLogo } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { appName, schoolName } from "@/lib/env";
import { fmt, zonedNow, zonedInstant } from "@/lib/utils";
import { Countdown } from "./countdown";

function nextWednesday() {
  const z = zonedNow();
  const delta = (3 - z.getDay() + 7) % 7 || 7;
  const day = new Date(z.getFullYear(), z.getMonth(), z.getDate() + delta);
  return zonedInstant(day.getFullYear(), day.getMonth(), day.getDate(), 15, 45);
}

export default function LandingPage() {
  const next = nextWednesday();
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
              <p className="front-hero-standfirst">
                <strong>{appName}</strong> organises every weekly session: who is meeting, what is on the agenda, which position papers are due and where the materials are.
                Delegates see their committee. Chairs run it. The Secretariat sees the whole programme.
              </p>
              <div className="front-hero-actions">
                <Link href="/welcome" className="btn btn-lg">
                  First-time setup
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Already have an account
                </Link>
              </div>
            </div>
            <div className="front-hero-logo"><BrandLogo height={110} className="w-full" /></div>
          </section>

          <section className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Sessions", "Every week has a date, a room, an agenda and a committee line-up."],
              ["Calendar", "Position papers, speeches and research briefs assigned, tracked and reviewed by your chair."],
              ["Committees", "Topic, background guide, chair team, members, resources and submissions in one workspace."],
              ["School accounts", "Access starts with a verified school email. Chairs see their committee; delegates see their own work."],
            ].map(([t, b]) => (
              <div key={t} className="card-rule bg-surface border border-line">
                <span className="section-label">{t}</span>
                <p className="m-0 small muted">{b}</p>
              </div>
            ))}
          </section>

          <section className="front-countdown">
            <p className="countdown-label">Next weekly session · {fmt(next, "EEEE d MMMM, HH:mm")}</p>
            <Countdown target={next.toISOString()} />
          </section>
        </div>
      </main>
      <footer className="main-inner !pt-0 !pb-8 flex items-center justify-between label-caps">
        <span>{appName}</span>
        <span>Internal platform · access by verified school email</span>
      </footer>
    </>
  );
}
