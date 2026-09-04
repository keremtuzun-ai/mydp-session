import Link from "next/link";
import { ArrowRight, CalendarDays, Landmark, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand, BrandMark } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { appName, schoolName } from "@/lib/env";

const FEATURES = [
  { icon: CalendarDays, title: "One weekly rhythm", body: "Every session has a date, a room, an agenda and a committee line-up. Nothing lives in a group chat." },
  { icon: ListChecks, title: "Responsibilities, not reminders", body: "Position papers, speeches and research briefs are assigned, tracked and reviewed by your chair." },
  { icon: Landmark, title: "A workspace per committee", body: "Topic, background guide, chair team, members, resources and submissions in one place." },
  { icon: ShieldCheck, title: "School accounts only", body: "Access starts with a verified school email. Chairs see their committee; delegates see their own work." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
          <p className="eyebrow">{schoolName}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            The weekly home of the <span className="text-gold-deep dark:text-gold">Model United Nations</span> programme.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {appName} organises every weekly session: who is meeting, what is on the agenda, which tasks are due, and where the
            materials are. Delegates see their committee. Chairs run it. The Secretariat sees the whole programme.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="gold">
              <Link href="/welcome">
                First-time setup <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Already have an account? Sign in</Link>
            </Button>
          </div>
        </section>
        <section className="border-t bg-card/60">
          <div className="mx-auto grid max-w-5xl gap-6 px-5 py-14 sm:grid-cols-2 sm:px-8">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-navy text-primary-foreground seal dark:bg-navy-deep">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="flex items-center justify-between px-5 py-6 text-xs text-muted-foreground sm:px-8">
        <span className="inline-flex items-center gap-2">
          <BrandMark className="size-5" /> {appName}
        </span>
        <span>Internal platform · access by verified school email</span>
      </footer>
    </div>
  );
}
