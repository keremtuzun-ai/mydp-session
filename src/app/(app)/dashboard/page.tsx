import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Landmark, Library, ListChecks, Megaphone, Plus, User, Settings, ClipboardCheck, BarChart3 } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listSessionsWithCoverage, getUploadCounts, getNameMap, nameOf, SESSION_COMMITTEE_COLUMNS } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionCard } from "@/components/mun/session-card";
import { EmptyState } from "@/components/mun/empty-state";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { CommitteeSeal } from "@/components/mun/committee-badge";
import { MembershipBadge } from "@/components/mun/role-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FormSuccess } from "@/components/ui/field";
import { relativeDue, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_LINKS = [
  { href: "/calendar", label: "My tasks", icon: ListChecks },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/committees", label: "Committees", icon: Landmark },
  { href: "/materials", label: "Materials", icon: Library },
  { href: "/settings", label: "Profile", icon: User },
];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [upcoming, { data: committees }, { data: tasks }, { data: announcements }, { data: attendance }, { data: sessionsDone }] = await Promise.all([
    listSessionsWithCoverage(supabase, { from: now, order: "asc", limit: 1 }),
    supabase.from("committees").select("*").in("id", viewer.memberCommitteeIds.length ? viewer.memberCommitteeIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("tasks")
      .select("*")
      .not("status", "in", "(completed,reviewed)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase.from("announcements").select("*").lte("published_at", now).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(4),
    supabase.from("attendance_records").select("status, session_id").eq("profile_id", viewer.userId),
    supabase.from("weekly_sessions").select("id").eq("status", "completed"),
  ]);

  const nextSession = upcoming.find((s) => s.status === "published") ?? upcoming[0];
  const taskList = tasks ?? [];
  const uploadCounts = await getUploadCounts(supabase, taskList.map((t) => t.id));
  const names = await getNameMap(supabase, [...taskList.map((t) => t.created_by), ...(announcements ?? []).map((a) => a.author_id)]);

  const attended = (attendance ?? []).filter((a) => a.status === "present" || a.status === "late").length;
  const recorded = (attendance ?? []).length;
  const held = (sessionsDone ?? []).length;
  const rate = recorded ? Math.round((attended / recorded) * 100) : null;

  // The viewer's committee blocks in the next session
  const { data: nextBlocks } = nextSession
    ? await supabase.from("session_committees").select(`${SESSION_COMMITTEE_COLUMNS}, committees ( acronym, name, slug )`).eq("session_id", nextSession.id)
    : { data: [] };
  const myBlocks = (nextBlocks ?? []).filter((b) => viewer.memberCommitteeIds.includes(b.committee_id));

  const firstName = viewer.profile.display_name?.split(" ")[0] ?? viewer.profile.username;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={formatDate(new Date())}
        title={`Good to see you, ${firstName}.`}
        description="Your next session, your responsibilities and your committee, at a glance."
        actions={
          <>
            {viewer.isStaff ? (
              <Button asChild>
                <Link href="/sessions/new">
                  <Plus className="size-4" aria-hidden /> New session
                </Link>
              </Button>
            ) : null}
            {viewer.isStaff || viewer.isChair ? (
              <Button asChild variant="outline">
                <Link href="/calendar/new">
                  <Plus className="size-4" aria-hidden /> Assign task
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      {sp.welcome === "1" ? <FormSuccess message="Your profile is complete. Welcome to the programme." /> : null}
      {sp.denied === "1" ? <div role="alert" className="rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm">That page is reserved for another role.</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2" aria-labelledby="next-session">
          <h2 id="next-session" className="eyebrow">
            Next weekly session
          </h2>
          {nextSession ? (
            <>
              <SessionCard session={nextSession} committeeAcronyms={nextSession.committees.map((c) => c.acronym)} highlight agendaPreview={nextSession.general_agenda} />
              {myBlocks.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {myBlocks.map((b) => (
                    <li key={b.id} className="rounded-md border bg-card p-3 text-sm">
                      <p className="font-semibold">{b.committees?.acronym}: {b.topic ?? "Topic to be announced"}</p>
                      {b.agenda ? <p className="mt-1 line-clamp-2 text-muted-foreground">{b.agenda}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <EmptyState icon={CalendarDays} title="No session scheduled" description="The Secretariat has not published the next weekly session yet." />
          )}
        </section>

        <section className="space-y-3" aria-labelledby="my-committee">
          <h2 id="my-committee" className="eyebrow">
            {viewer.memberships.length === 1 ? "Your committee" : "Your committees"}
          </h2>
          {committees && committees.length ? (
            <div className="space-y-2">
              {committees.map((c) => {
                const m = viewer.memberships.find((x) => x.committee_id === c.id);
                return (
                  <Link key={c.id} href={`/committees/${c.slug}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Card className="card-lift flex items-center gap-3 p-4">
                      <CommitteeSeal acronym={c.acronym} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold leading-tight">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.current_topic ?? c.category}</p>
                      </div>
                      {m ? <MembershipBadge role={m.membership_role} /> : null}
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Landmark} title="No committee yet" description="You will be placed in a committee by the Secretariat." className="py-8" />
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="upcoming-tasks">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="upcoming-tasks" className="eyebrow">
              Upcoming tasks
            </h2>
            <Link href="/calendar" className="text-sm underline-offset-4 hover:underline">
              All tasks
            </Link>
          </div>
          {taskList.length ? (
            <ul className="divide-y rounded-lg border bg-card">
              {taskList.map((t) => (
                <li key={t.id}>
                  <Link href={`/calendar/${t.id}`} className="flex flex-col gap-2 p-4 hover:bg-muted/40 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeDue(t.due_at)} · assigned by {nameOf(names, t.created_by)}
                        {uploadCounts.get(t.id) ? ` · ${uploadCounts.get(t.id)} upload${uploadCounts.get(t.id) === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ListChecks} title="Nothing due" description="You have no open tasks. Enjoy the calm before the caucus." className="py-8" />
          )}
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
              <CardDescription>{held} session{held === 1 ? "" : "s"} held so far</CardDescription>
            </CardHeader>
            <CardContent>
              {rate === null ? (
                <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>
              ) : (
                <>
                  <div className="flex items-end justify-between">
                    <span className="font-display text-3xl font-semibold">{rate}%</span>
                    <span className="text-xs text-muted-foreground">{attended} of {recorded} attended</span>
                  </div>
                  <Progress value={rate} className="mt-2" label="Attendance rate" />
                </>
              )}
              <Link href="/attendance" className="mt-3 inline-block text-sm underline-offset-4 hover:underline">
                View history
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[...QUICK_LINKS, ...(viewer.isStaff ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }] : []), ...(viewer.isChair || viewer.isStaff ? [{ href: "/attendance", label: "Roll call", icon: ClipboardCheck }] : []), { href: "/settings", label: "Settings", icon: Settings }].map(({ href, label, icon: Icon }) => (
                <Link key={href + label} href={href} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Icon className="size-4 text-gold-deep" aria-hidden /> {label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <section aria-labelledby="recent-announcements">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent-announcements" className="eyebrow">
            Recent announcements
          </h2>
          <Link href="/announcements" className="text-sm underline-offset-4 hover:underline">
            All announcements
          </Link>
        </div>
        {announcements && announcements.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {announcements.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{a.title}</p>
                  {a.pinned ? <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-deep">Pinned</span> : null}
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{nameOf(names, a.author_id, "Secretariat")} · {formatDate(a.published_at)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Megaphone} title="No announcements" className="py-8" />
        )}
      </section>
    </div>
  );
}
