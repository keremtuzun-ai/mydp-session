import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ExternalLink, Library, ListChecks, Megaphone, Users } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf, getUploadCounts, SESSION_COMMITTEE_COLUMNS } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { CommitteeSeal } from "@/components/mun/committee-badge";
import { MembershipBadge } from "@/components/mun/role-badge";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { PriorityBadge } from "@/components/mun/priority-badge";
import { EmptyState } from "@/components/mun/empty-state";
import { UserChip } from "@/components/mun/user-chip";
import { UploadList } from "@/components/mun/upload-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, relativeDue, humanize } from "@/lib/utils";
import { CommitteeManagePanel, MembershipManager, SubmissionForm, DeleteSubmissionButton } from "./committee-controls";

export const metadata: Metadata = { title: "Committee" };

export default async function CommitteePage({ params }: PageProps<"/committees/[slug]">) {
  const { slug } = await params;
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: committee } = await supabase.from("committees").select("*").eq("slug", slug).maybeSingle();
  if (!committee) notFound();

  const isMember = viewer.memberCommitteeIds.includes(committee.id);
  const canManage = viewer.isStaff || viewer.chairedCommitteeIds.includes(committee.id);
  const now = new Date().toISOString();

  const [{ data: memberships }, { data: upcomingBlocks }, { data: tasks }, { data: materials }, { data: announcements }, { data: submissions }] = await Promise.all([
    supabase.from("committee_memberships").select("*").eq("committee_id", committee.id).order("membership_role").order("created_at"),
    supabase.from("session_committees").select(`${SESSION_COMMITTEE_COLUMNS}, weekly_sessions!inner ( id, title, starts_at, ends_at, status )`).eq("committee_id", committee.id).gte("weekly_sessions.starts_at", now).order("created_at"),
    supabase.from("tasks").select("*").eq("assigned_committee_id", committee.id).not("status", "in", "(completed)").order("due_at", { ascending: true, nullsFirst: false }).limit(12),
    supabase.from("materials").select("*").eq("committee_id", committee.id).order("created_at", { ascending: false }),
    supabase.from("announcements").select("*").eq("target_committee_id", committee.id).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(6),
    supabase.from("committee_submissions").select("*").eq("committee_id", committee.id).order("created_at", { ascending: false }),
  ]);

  const memberList = memberships ?? [];
  const names = await getNameMap(supabase, [
    ...memberList.map((m) => m.profile_id),
    ...(tasks ?? []).map((t) => t.assigned_to_profile_id),
    ...(announcements ?? []).map((a) => a.author_id),
    ...(submissions ?? []).map((s) => s.profile_id),
  ]);
  const uploadCounts = await getUploadCounts(supabase, (tasks ?? []).map((t) => t.id));
  const chairTeam = memberList.filter((m) => m.membership_role === "chair" || m.membership_role === "co_chair" || m.membership_role === "executive");
  const delegates = memberList.filter((m) => m.membership_role === "delegate");
  const blocks = (upcomingBlocks ?? []).filter((b) => b.weekly_sessions && b.weekly_sessions.status !== "cancelled").sort((a, b) => a.weekly_sessions!.starts_at.localeCompare(b.weekly_sessions!.starts_at));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CommitteeSeal acronym={committee.acronym} size="lg" className="hidden sm:flex" />
        <div className="flex-1">
          <PageHeader
            eyebrow={committee.category}
            title={committee.name}
            description={committee.description ?? undefined}
            className="mb-0"
            actions={
              <>
                <Badge variant={committee.is_open ? "success" : "muted"}>{committee.is_open ? "Open" : "Closed"}</Badge>
                {isMember ? <Badge variant="gold">Your committee</Badge> : null}
                {canManage ? <CommitteeManagePanel committee={committee} canRename={viewer.isStaff} canDelete={viewer.isAdmin} /> : null}
              </>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-gold-deep" aria-hidden /> Current topic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-xl">{committee.current_topic ?? "To be announced"}</p>
            {committee.background_guide_url ? (
              <Button asChild variant="outline" size="sm">
                <a href={committee.background_guide_url} target="_blank" rel="noopener noreferrer">
                  Background guide <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No background guide linked yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chair team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {chairTeam.length ? (
              chairTeam.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <UserChip name={nameOf(names, m.profile_id)} username={names.get(m.profile_id)?.username} avatarUrl={names.get(m.profile_id)?.avatar_url} />
                  <MembershipBadge role={m.membership_role} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chairs to be announced.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="members">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="members" className="eyebrow">
              Delegates ({delegates.length})
            </h2>
          </div>
          {delegates.length ? (
            <ul className="divide-y rounded-lg border bg-card">
              {delegates.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 p-3">
                  <UserChip name={nameOf(names, m.profile_id)} username={names.get(m.profile_id)?.username} avatarUrl={names.get(m.profile_id)?.avatar_url} />
                  <div className="flex items-center gap-2">
                    {m.delegation ? <span className="text-xs text-muted-foreground">{m.delegation}</span> : null}
                    {canManage ? <MembershipManager.Remove membershipId={m.id} name={nameOf(names, m.profile_id)} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="No delegates yet" className="py-8" />
          )}
          {canManage ? <MembershipManager.Add committeeId={committee.id} canAppointChairs={viewer.isStaff} /> : null}
        </section>

        <section aria-labelledby="upcoming">
          <h2 id="upcoming" className="eyebrow mb-3">
            Upcoming committee work
          </h2>
          {blocks.length ? (
            <ul className="mb-4 divide-y rounded-lg border bg-card">
              {blocks.map((b) => (
                <li key={b.id} className="p-3">
                  <Link href={`/sessions/${b.weekly_sessions!.id}`} className="font-medium underline-offset-4 hover:underline">
                    {b.weekly_sessions!.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(b.weekly_sessions!.starts_at)} · {b.topic ?? "Topic to be announced"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming session for this committee" className="mb-4 py-6" />
          )}
          {tasks && tasks.length ? (
            <ul className="divide-y rounded-lg border bg-card">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/calendar/${t.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.assigned_to_profile_id ? nameOf(names, t.assigned_to_profile_id) : "Everyone in committee"} · {relativeDue(t.due_at)}
                        {uploadCounts.get(t.id) ? ` · ${uploadCounts.get(t.id)} upload(s)` : ""}
                      </p>
                    </div>
                    <PriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ListChecks} title="No open tasks" className="py-6" />
          )}
          {canManage ? (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/calendar/new?committee=${committee.id}`}>Assign a committee task</Link>
            </Button>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="resources">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="resources" className="eyebrow">
              Resources
            </h2>
            <Link href={`/materials?committee=${committee.id}`} className="text-sm underline-offset-4 hover:underline">
              All materials
            </Link>
          </div>
          {materials && materials.length ? (
            <ul className="divide-y rounded-lg border bg-card">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{humanize(m.category)} · {formatDate(m.created_at)}</p>
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
            <EmptyState icon={Library} title="No committee resources yet" className="py-8" />
          )}
        </section>

        <section aria-labelledby="announcements">
          <h2 id="announcements" className="eyebrow mb-3">
            Committee announcements
          </h2>
          {announcements && announcements.length ? (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id} className="p-4">
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{nameOf(names, a.author_id, "Chair")} · {formatDateTime(a.published_at)}</p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No announcements" className="py-8" />
          )}
          {canManage ? (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/announcements?committee=${committee.id}#new`}>Post to this committee</Link>
            </Button>
          ) : null}
        </section>
      </div>

      {committee.submissions_enabled && (isMember || canManage) ? (
        <section aria-labelledby="submissions">
          <h2 id="submissions" className="eyebrow mb-3">
            Position papers and preparation
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <UploadList
                items={(submissions ?? []).map((s) => ({
                  id: s.id,
                  title: s.title,
                  notes: s.notes,
                  file_name: s.file_name,
                  mime_type: s.mime_type,
                  size_bytes: s.size_bytes,
                  created_at: s.created_at,
                  authorName: nameOf(names, s.profile_id),
                  downloadHref: `/api/files/submissions/${s.id}`,
                }))}
                emptyTitle="No submissions yet"
                emptyDescription={canManage ? "Delegates' position papers will appear here." : "Upload your position paper before the deadline your chair announced."}
              >
                {(item) => ((submissions ?? []).find((s) => s.id === item.id)?.profile_id === viewer.userId || canManage ? <DeleteSubmissionButton id={item.id} /> : null)}
              </UploadList>
            </div>
            {isMember ? <SubmissionForm committeeId={committee.id} /> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
