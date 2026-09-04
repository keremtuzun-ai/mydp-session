import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SessionStatusBadge } from "@/components/mun/session-status-badge";
import type { WeeklySession } from "@/lib/types/database";
import { formatTimeRange, formatDate } from "@/lib/utils";
import { CalendarDays, MapPin, Video } from "lucide-react";
import { format } from "date-fns";

type Props = {
  session: Pick<WeeklySession, "id" | "title" | "theme" | "starts_at" | "ends_at" | "location" | "meeting_url" | "status">;
  committeeAcronyms?: string[];
  attendanceSummary?: string;
  highlight?: boolean;
  agendaPreview?: string | null;
};

export function SessionCard({ session, committeeAcronyms = [], attendanceSummary, highlight, agendaPreview }: Props) {
  const start = new Date(session.starts_at);
  return (
    <Link href={`/sessions/${session.id}`} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className={`card-lift flex h-full gap-4 p-5 ${highlight ? "border-gold-deep/60 bg-gradient-to-br from-card to-accent/50" : ""}`}>
        <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-navy py-2 text-primary-foreground dark:bg-navy-deep seal">
          <span className="text-[10px] uppercase tracking-widest">{format(start, "MMM")}</span>
          <span className="font-display text-2xl font-semibold leading-none">{format(start, "d")}</span>
          <span className="text-[10px] uppercase tracking-widest">{format(start, "EEE")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight group-hover:underline decoration-gold-deep underline-offset-4">{session.title}</h3>
            <SessionStatusBadge status={session.status} />
          </div>
          {session.theme ? <p className="text-sm text-gold-deep dark:text-gold">{session.theme}</p> : null}
          <dl className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              <span>
                {formatDate(session.starts_at)} · {formatTimeRange(session.starts_at, session.ends_at)}
              </span>
            </div>
            {session.location ? (
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden />
                <span className="truncate">{session.location}</span>
              </div>
            ) : session.meeting_url ? (
              <div className="inline-flex items-center gap-1.5">
                <Video className="size-3.5" aria-hidden />
                <span>Online</span>
              </div>
            ) : null}
          </dl>
          {agendaPreview ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{agendaPreview}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {committeeAcronyms.map((a) => (
              <span key={a} className="rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {a}
              </span>
            ))}
            {attendanceSummary ? <span className="ml-auto text-xs text-muted-foreground">{attendanceSummary}</span> : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
