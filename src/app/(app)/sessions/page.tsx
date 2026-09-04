import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listSessionsWithCoverage, attendanceSummaryText } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionCard } from "@/components/mun/session-card";
import { EmptyState } from "@/components/mun/empty-state";
import { Button } from "@/components/ui/button";
import { SessionFilters } from "./session-filters";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  const sp = await searchParams;
  const scope = sp.scope === "past" ? "past" : sp.scope === "all" ? "all" : "upcoming";
  const committee = typeof sp.committee === "string" ? sp.committee : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const viewer = await getViewer();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [sessions, { data: committees }] = await Promise.all([
    listSessionsWithCoverage(supabase, scope === "upcoming" ? { from: now, order: "asc" } : scope === "past" ? { to: now, order: "desc" } : { order: "desc" }),
    supabase.from("committees").select("id, acronym, name").order("acronym"),
  ]);
  const filtered = sessions.filter((s) => (!committee || s.committees.some((c) => c.id === committee)) && (!status || s.status === status));

  return (
    <div>
      <PageHeader
        eyebrow="Weekly programme"
        title="Sessions"
        description="Every weekly session with its agenda, committee coverage and attendance."
        actions={
          viewer.isStaff ? (
            <Button asChild>
              <Link href="/sessions/new">
                <Plus className="size-4" aria-hidden /> New session
              </Link>
            </Button>
          ) : null
        }
      />
      <SessionFilters scope={scope} committee={committee} status={status} committees={committees ?? []} />
      {filtered.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {filtered.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              committeeAcronyms={s.committees.map((c) => c.acronym)}
              attendanceSummary={attendanceSummaryText(s.attendance)}
              agendaPreview={s.general_agenda}
              highlight={scope === "upcoming" && i === 0 && s.status === "published"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={scope === "upcoming" ? "No upcoming sessions" : "No sessions match"}
          description={scope === "upcoming" ? "New sessions appear here once the Secretariat publishes them." : "Try another filter."}
          className="mt-4"
        />
      )}
    </div>
  );
}
