import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Video, Shirt, Pencil, Megaphone, ListChecks, Library, MessageSquare } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf, getUploadCounts, SESSION_COMMITTEE_COLUMNS } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { SessionStatusBadge, AttendanceBadge } from "@/components/mun/session-status-badge";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { CommitteeSeal } from "@/components/mun/committee-badge";
import { EmptyState } from "@/components/mun/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTimeRange, relativeDue, formatDateTime, humanize } from "@/lib/utils";
import { SessionStatusControls, CommitteeBlockEditor, FeedbackForm } from "./session-controls";

export const metadata: Metadata = { title: "Session" };

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: session } = await supabase.from("weekly_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();

  const [{ data: blocks }, { data: announcements }, { data: tasks }, { data: materials }, { data: myAttendance }, { data: feedback }] = await Promise.all([
    supabase.from("session_committees").select(`${SESSION_COMMITTEE_COLUMNS}, committees ( id, acronym, name, slug )`).eq("session_id", id),
    supabase.from("announcements").select("*").eq("target_session_id", id).order("pinned", { ascending: false }).order("published_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("session_id", id).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("materials").select("*").eq("session_id", id).order("created_at", { ascending: false }),
    supabase.from("attendance_records").select("status, note").eq("session_id", id).eq("profile_id", viewer.userId).maybeSingle(),
    supabase.from("session_feedback").select("*").eq("session_id", id).order("created_at", { ascending: false }),
  ]);

  const blockList = (blocks ?? []).sort((a, b) => (a.committees?.acronym ?? "").localeCompare(b.committees?.acronym ?? ""));
  const canManageBlock = (committeeId: string) => viewer.isStaff || viewer.chairedCommitteeIds.includes(committeeId);
  // Chair notes only for authorised roles (column is hidden from others by the DB).
  const chairNotes = new Map<string, string | null>();
  await Promise.all(
    blockList.filter((b) => canManageBlock(b.committee_id)).map(async (b) => {
      const { data } = await supabase.rpc("session_chair_notes", { sc: b.id });
      chairNotes.set(b.id, data ?? null);
    }),
  );

  const taskList = tasks ?? [];
  const uploadCounts = await getUploadCounts(supabase, taskList.map((t) => t.id));
  const names = await getNameMap(supabase, [
    ...taskList.map((t) => t.created_by),
    ...taskList.map((t) => t.assigned_to_profile_id),
    ...(announcements ?? []).map((a) => a.author_id),
    ...(feedback ?? []).flatMap((f) => [f.author_id, f.profile_id]),
  ]);

  // Members the viewer may write feedback for (chairs: their committees; staff: all members in this session's committees)
  let feedbackTargets: { id: string; name: string }[] = [];
  if (viewer.isStaff || viewer.isChair) {
    const committeeIds = blockList.map((b) => b.committee_id).filter((c) => viewer.isStaff || viewer.chairedCommitteeIds.includes(c));
    if (committeeIds.length) {
      const { data: members } = await supabase.from("committee_memberships").select("profile_id").in("committee_id", committeeIds).eq("membership_role", "delegate");
      const memberNames = await getNameMap(supabase, (members ?? []).map((m) => m.profile_id));
      feedbackTargets = Array.from(new Set((members ?? []).map((m) => m.profile_id))).map((pid) => ({ id: pid, name: nameOf(memberNames, pid) }));
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow={`Weekly session · ${formatDate(session.starts_at)}`}
        title={session.title}
        description={session.theme ?? session.description ?? undefined}
        actions={
          <>
            <SessionStatusBadge status={session.status} />
            {viewer.isStaff ? (
              <>
                <Link href={`/sessions/${session.id}/edit`} className="btn btn-outline btn-sm">
                  <Pencil aria-hidden /> Edit
                </Link>
                <SessionStatusControls sessionId={session.id} status={session.status} />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-[0.9rem] sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-gold-deep" aria-hidden /> {formatDate(session.starts_at)} · {formatTimeRange(session.starts_at, session.ends_at)}
            </p>
            {session.location ? (
              <p className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-gold-deep" aria-hidden /> {session.location}
              </p>
            ) : null}
            {session.meeting_url ? (
              <p className="inline-flex items-center gap-2">
                <Video className="size-4 text-gold-deep" aria-hidden />
                <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  Join online
                </a>
              </p>
            ) : null}
            {session.dress_code ? (
              <p className="inline-flex items-center gap-2">
                <Shirt className="size-4 text-gold-deep" aria-hidden /> {session.dress_code}
              </p>
            ) : null}
            {session.description ? <p className="muted sm:col-span-2">{session.description}</p> : null}
            {session.general_agenda ? (
              <div className="sm:col-span-2">
                <span className="section-label">General agenda</span>
                <pre className="whitespace-pre-wrap rounded-[7px] border border-line-soft bg-surface-2 p-3 font-sans text-[0.9rem]">{session.general_agenda}</pre>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <AttendanceBadge status={myAttendance?.status} />
            {myAttendance?.note ? <p className="muted">Note: {myAttendance.note}</p> : null}
            {viewer.isStaff || viewer.isChair ? (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/attendance?session=${session.id}`}>Take roll call</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="committee-blocks">
        <div className="section-head"><h2 id="committee-blocks">Committee agenda blocks</h2></div>
        {blockList.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {blockList.map((b) => (
              <Card key={b.id} className="card-rule">
                <div className="flex items-start gap-3">
                  <CommitteeSeal acronym={b.committees?.acronym ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/committees/${b.committees?.slug}`} className="row-title">
                      {b.committees?.name}
                    </Link>
                    <p className="m-0 text-[0.9rem] text-gold">{b.topic ?? "Topic to be announced"}</p>
                  </div>
                  {viewer.memberCommitteeIds.includes(b.committee_id) ? <Badge variant="gold">Yours</Badge> : null}
                </div>
                {b.agenda ? <pre className="mt-3 whitespace-pre-wrap font-sans text-[0.9rem] muted">{b.agenda}</pre> : <p className="mt-3 text-sm muted">No agenda yet.</p>}
                {canManageBlock(b.committee_id) ? (
                  <CommitteeBlockEditor block={{ id: b.id, topic: b.topic, agenda: b.agenda, chair_notes: chairNotes.get(b.id) ?? null }} acronym={b.committees?.acronym ?? ""} />
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No committees assigned" description="This session has no committee blocks yet." className="empty-state-sm" />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="session-tasks">
          <div className="section-head">
            <h2 id="session-tasks">Tasks for this session</h2>
            {viewer.isStaff || viewer.isChair ? (
              <Link href={`/calendar/new?session=${session.id}`} className="section-tail prose-link">
                Assign task
              </Link>
            ) : null}
          </div>
          {taskList.length ? (
            <ul className="ledger">
              {taskList.map((t) => (
                <li key={t.id}>
                  <Link href={`/calendar/${t.id}`} className="flex flex-col gap-2 no-underline text-ink sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-[650]">{t.title}</p>
                      <p className="m-0 row-sub">
                        {t.assigned_to_profile_id ? nameOf(names, t.assigned_to_profile_id) : t.assigned_role ? `All ${t.assigned_role}s` : "Committee-wide"} · {relativeDue(t.due_at)}
                        {uploadCounts.get(t.id) ? ` · ${uploadCounts.get(t.id)} upload(s)` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <PriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ListChecks} title="No tasks linked" className="empty-state-sm" />
          )}
        </section>

        <section aria-labelledby="session-materials">
          <div className="section-head"><h2 id="session-materials">Resources</h2></div>
          {materials && materials.length ? (
            <ul className="ledger">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 font-[650]">{m.title}</p>
                    <p className="m-0 row-sub">{humanize(m.category)}</p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/files/materials/${m.id}`} target="_blank" rel="noopener noreferrer">
                      Open
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Library} title="No resources attached" className="empty-state-sm" />
          )}
        </section>
      </div>

      <section aria-labelledby="session-announcements">
        <div className="section-head"><h2 id="session-announcements">Announcements for this session</h2></div>
        {announcements && announcements.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {announcements.map((a) => (
              <Card key={a.id} className="card-tight">
                <p className="m-0 font-[650]">{a.title}</p>
                <p className="m-0 mt-1 whitespace-pre-wrap small muted">{a.body}</p>
                <p className="m-0 mt-2 dateline">{nameOf(names, a.author_id, "Secretariat")} · {formatDateTime(a.published_at)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Megaphone} title="Nothing announced for this session" className="empty-state-sm" />
        )}
      </section>

      <section aria-labelledby="session-feedback">
        <div className="section-head"><h2 id="session-feedback">Post-session feedback</h2></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            {feedback && feedback.length ? (
              <ul className="ledger">
                {feedback.map((f) => (
                  <li key={f.id}>
                    <p className="m-0 text-[0.92rem]">{f.body}</p>
                    <p className="m-0 mt-1 dateline">
                      For {nameOf(names, f.profile_id)} · from {nameOf(names, f.author_id, "Chair")} · {formatDateTime(f.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={MessageSquare} title="No feedback yet" description={session.status === "completed" ? "Chairs add feedback after the session." : "Feedback appears once the session is complete."} className="empty-state-sm" />
            )}
          </div>
          {feedbackTargets.length ? <FeedbackForm sessionId={session.id} targets={feedbackTargets} /> : null}
        </div>
      </section>
    </div>
  );
}
