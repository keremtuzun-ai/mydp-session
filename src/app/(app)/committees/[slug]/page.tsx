import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf, getUploadCounts, SESSION_COMMITTEE_COLUMNS } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
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
import { CommitteeManagePanel, AddMember, RemoveMember, SubmissionForm, DeleteSubmissionButton } from "./committee-controls";
import { ResolutionLedger } from "@/components/mun/resolution-ledger";
import { ResolutionForm } from "@/components/mun/resolution-form";
import { toActor } from "@/lib/auth/actor";
import { canManageResolution } from "@/lib/policy";

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

  const [{ data: memberships }, { data: upcomingBlocks }, { data: tasks }, { data: materials }, { data: announcements }, { data: submissions }, { data: resolutions }] = await Promise.all([
    supabase.from("committee_memberships").select("*").eq("committee_id", committee.id).order("membership_role").order("created_at"),
    supabase.from("session_committees").select(`${SESSION_COMMITTEE_COLUMNS}, weekly_sessions!inner ( id, title, starts_at, ends_at, status )`).eq("committee_id", committee.id).gte("weekly_sessions.starts_at", now).order("created_at"),
    supabase.from("tasks").select("*").eq("assigned_committee_id", committee.id).not("status", "in", "(completed)").order("due_at", { ascending: true, nullsFirst: false }).limit(12),
    supabase.from("materials").select("*").eq("committee_id", committee.id).order("created_at", { ascending: false }),
    supabase.from("announcements").select("*").eq("target_committee_id", committee.id).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(6),
    supabase.from("committee_submissions").select("*").eq("committee_id", committee.id).order("created_at", { ascending: false }),
    supabase.from("resolution_links").select("*").eq("committee_id", committee.id).order("updated_at", { ascending: false }),
  ]);

  const memberList = memberships ?? [];
  const names = await getNameMap(supabase, [
    ...memberList.map((m) => m.profile_id),
    ...(tasks ?? []).map((t) => t.assigned_to_profile_id),
    ...(announcements ?? []).map((a) => a.author_id),
    ...(submissions ?? []).map((s) => s.profile_id),
    ...(resolutions ?? []).map((r) => r.profile_id),
  ]);
  const actor = toActor(viewer);
  const resolutionRows = (resolutions ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    kind: r.kind,
    notes: r.notes,
    updated_at: r.updated_at,
    authorName: nameOf(names, r.profile_id),
    delegation: memberList.find((m) => m.profile_id === r.profile_id)?.delegation ?? null,
    canManage: canManageResolution(actor, r),
  }));
  const uploadCounts = await getUploadCounts(supabase, (tasks ?? []).map((t) => t.id));
  const chairTeam = memberList.filter((m) => m.membership_role === "chair" || m.membership_role === "co_chair" || m.membership_role === "executive");
  const delegates = memberList.filter((m) => m.membership_role === "delegate");
  const blocks = (upcomingBlocks ?? []).filter((b) => b.weekly_sessions && b.weekly_sessions.status !== "cancelled").sort((a, b) => a.weekly_sessions!.starts_at.localeCompare(b.weekly_sessions!.starts_at));

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="flex-1">
          <PageHeader
            eyebrow={committee.category}
            title={committee.acronym}
            description={`${committee.name}${committee.description ? ` · ${committee.description}` : ""}`}
            className="mb-0"
            actions={
              <>
                <Badge variant={committee.is_open ? "success" : "muted"} dot>{committee.is_open ? "Open" : "Closed"}</Badge>
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
            <CardTitle>Current topic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="m-0 font-serif text-[1.35rem] font-[640]">{committee.current_topic ?? "To be announced"}</p>
            {committee.background_guide_url ? (
              <Button asChild variant="outline" size="sm">
                <a href={committee.background_guide_url} target="_blank" rel="noopener noreferrer">
                  Background guide <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Button>
            ) : (
              <p className="text-sm muted">No background guide linked yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chair team</CardTitle>
          </CardHeader>
          <CardContent>
            {chairTeam.length ? (
              <ul className="people-list">{chairTeam.map((m) => (
                <li key={m.id} className="justify-between">
                  <UserChip name={nameOf(names, m.profile_id)} username={names.get(m.profile_id)?.username} avatarUrl={names.get(m.profile_id)?.avatar_url} />
                  <MembershipBadge role={m.membership_role} />
                </li>
              ))}</ul>
            ) : (
              <p className="m-0 small muted">Chairs to be announced.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="members">
          <div className="section-head"><h2 id="members">Delegates ({delegates.length})</h2></div>
          {delegates.length ? (
            <ul className="ledger">
              {delegates.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <UserChip name={nameOf(names, m.profile_id)} username={names.get(m.profile_id)?.username} avatarUrl={names.get(m.profile_id)?.avatar_url} />
                  <div className="flex items-center gap-2">
                    {m.delegation ? <span className="chip">{m.delegation}</span> : null}
                    {canManage ? <RemoveMember membershipId={m.id} name={nameOf(names, m.profile_id)} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No delegates yet" className="empty-state-sm" />
          )}
          {canManage ? <AddMember committeeId={committee.id} canAppointChairs={viewer.isStaff} /> : null}
        </section>

        <section aria-labelledby="upcoming">
          <div className="section-head"><h2 id="upcoming">Upcoming committee work</h2></div>
          {blocks.length ? (
            <ul className="ledger mb-4">
              {blocks.map((b) => (
                <li key={b.id}>
                  <Link href={`/sessions/${b.weekly_sessions!.id}`} className="row-title">
                    {b.weekly_sessions!.title}
                  </Link>
                  <p className="m-0 row-sub">
                    {formatDate(b.weekly_sessions!.starts_at)} · {b.topic ?? "Topic to be announced"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming session for this committee" className="empty-state-sm mb-4" />
          )}
          {tasks && tasks.length ? (
            <ul className="ledger">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/calendar/${t.id}`} className="flex items-center gap-3 no-underline text-ink">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate font-[650]">{t.title}</p>
                      <p className="m-0 row-sub">
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
            <EmptyState title="No open tasks" className="empty-state-sm" />
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
          <div className="section-head"><h2 id="resources">Resources</h2>
            <Link href={`/materials?committee=${committee.id}`} className="section-tail prose-link">
              All materials
            </Link>
          </div>
          {materials && materials.length ? (
            <ul className="ledger">
              {materials.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-[650]">{m.title}</p>
                    <p className="m-0 row-sub">{humanize(m.category)} · {formatDate(m.created_at)}</p>
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
            <EmptyState title="No committee resources yet" className="empty-state-sm" />
          )}
        </section>

        <section aria-labelledby="announcements">
          <div className="section-head"><h2 id="announcements">Committee announcements</h2></div>
          {announcements && announcements.length ? (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id} className="card-tight">
                  <p className="m-0 font-[650]">{a.title}</p>
                  <p className="m-0 mt-1 whitespace-pre-wrap small muted">{a.body}</p>
                  <p className="m-0 mt-2 dateline">{nameOf(names, a.author_id, "Chair")} · {formatDateTime(a.published_at)}</p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No announcements" className="empty-state-sm" />
          )}
          {canManage ? (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/announcements?committee=${committee.id}#new`}>Post to this committee</Link>
            </Button>
          ) : null}
        </section>
      </div>

      {isMember || canManage ? (
        <section aria-labelledby="resolutions">
          <div className="section-head">
            <h2 id="resolutions">Resolutions and working papers</h2>
            <span className="tab-count">{resolutionRows.length}</span>
          </div>
          <div className="two-col-wide grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ResolutionLedger rows={resolutionRows} emptyDescription="Delegates share the link to their Google Doc here so the committee and chairs can read it." />
            <ResolutionForm committees={[{ id: committee.id, acronym: committee.acronym }]} defaultCommitteeId={committee.id} />
          </div>
        </section>
      ) : null}

      {committee.submissions_enabled && (isMember || canManage) ? (
        <section aria-labelledby="submissions">
          <div className="section-head"><h2 id="submissions">Position papers and preparation</h2></div>
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
