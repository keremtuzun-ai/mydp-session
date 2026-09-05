import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listSessionsWithCoverage, attendanceSummaryText } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionCard } from "@/components/mun/session-card";
import { EmptyState } from "@/components/mun/empty-state";
import { SessionFilters } from "./session-filters";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  const sp = await searchParams;
  const scope = sp.scope === "past" ? "past" : sp.scope === "all" ? "all" : "upcoming";
  const status = typeof sp.status === "string" ? sp.status : "";

  const viewer = await getViewer();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const sessions = await listSessionsWithCoverage(supabase, scope === "upcoming" ? { from: now, order: "asc" } : scope === "past" ? { to: now, order: "desc" } : { order: "desc" });
  const filtered = sessions.filter((s) => !status || s.status === status);

  return (
    <div>
      <PageHeader
        eyebrow="Weekly programme"
        title="Sessions"
        description="Tuesdays, 10:55 in 1S and 15:10 in the Library."
        actions={
          viewer.isStaff ? (
            <Link href="/sessions/new" className="btn">
              New session
            </Link>
          ) : null
        }
      />
      <SessionFilters scope={scope} status={status} />
      {filtered.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filtered.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              attendanceSummary={attendanceSummaryText(s.attendance)}
              agendaPreview={s.general_agenda}
              highlight={scope === "upcoming" && i === 0 && s.status === "published"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={scope === "upcoming" ? "No upcoming sessions" : "No sessions match"}
          description={scope === "upcoming" ? "New sessions appear here once the Secretariat publishes them." : "Try another filter."}
          className="mt-5"
        />
      )}
    </div>
  );
}
