import Link from "next/link";
import { SessionStatusBadge } from "@/components/mun/session-status-badge";
import type { WeeklySession } from "@/lib/types/database";
import { formatTimeRange, formatDate } from "@/lib/utils";

type Props = {
  session: Pick<WeeklySession, "id" | "title" | "theme" | "starts_at" | "ends_at" | "location" | "status">;
  committeeAcronyms?: string[];
  attendanceSummary?: string;
  highlight?: boolean;
  agendaPreview?: string | null;
};

/** Schedule card: rule on top, mono time column, hairline rows. */
export function SessionCard({ session, committeeAcronyms = [], attendanceSummary, highlight, agendaPreview }: Props) {
  return (
    <Link href={`/sessions/${session.id}`} className={`schedule-card tile-hover block no-underline text-ink ${highlight ? "border-t-[var(--red)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[1.15rem]">{session.title}</h3>
          {session.theme ? <p className="m-0 mt-0.5 small muted">{session.theme}</p> : null}
        </div>
        <SessionStatusBadge status={session.status} />
      </div>
      <ul className="schedule-list mt-3">
        <li>
          <span className="schedule-time">{formatTimeRange(session.starts_at, session.ends_at)}</span>
          <span className="text-[0.9rem]">{formatDate(session.starts_at)}</span>
        </li>
        <li>
          <span className="schedule-time">{session.location ? "Room" : "Venue"}</span>
          <span className="text-[0.9rem] truncate">{session.location ?? "To be announced"}</span>
        </li>
        {agendaPreview ? (
          <li>
            <span className="schedule-time">Agenda</span>
            <span className="text-[0.9rem] muted line-clamp-2">{agendaPreview}</span>
          </li>
        ) : null}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {committeeAcronyms.map((a) => (
          <span key={a} className="chip chip-navy">
            {a}
          </span>
        ))}
        {attendanceSummary ? <span className="ml-auto label-caps">{attendanceSummary}</span> : null}
      </div>
    </Link>
  );
}
