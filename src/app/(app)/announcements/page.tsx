import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { AnnouncementCard, NewAnnouncementForm } from "./announcements-client";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: PageProps<"/announcements">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: announcements }, { data: reads }, { data: sessions }] = await Promise.all([
    supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("published_at", { ascending: false }),
    supabase.from("announcement_reads").select("announcement_id").eq("profile_id", viewer.userId),
    supabase.from("weekly_sessions").select("id, title, starts_at").order("starts_at", { ascending: false }).limit(12),
  ]);
  const committees: { id: string; acronym: string; name: string }[] = [];
  const list = announcements ?? [];
  const readSet = new Set((reads ?? []).map((r) => r.announcement_id));
  const names = await getNameMap(supabase, list.map((a) => a.author_id));
  const committeeMap = new Map(committees.map((c) => [c.id, c.acronym]));
  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.title]));
  const canPost = viewer.isStaff;
  const postCommittees = committees;
  const unread = list.filter((a) => !readSet.has(a.id)).length;

  return (
    <div>
      <PageHeader eyebrow="Notice board" title="Announcements" description={unread ? `${unread} unread` : "You are up to date."} />
      <div className="two-col-wide grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {list.length ? (
            list.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                authorName={nameOf(names, a.author_id, "Secretariat")}
                audience={
                  a.target_committee_id ? committeeMap.get(a.target_committee_id) ?? "Committee" : a.target_session_id ? sessionMap.get(a.target_session_id) ?? "Session" : a.target_role ? `All ${a.target_role}s` : "Everyone"
                }
                isRead={readSet.has(a.id)}
                canManage={viewer.isStaff || a.author_id === viewer.userId}
                canPin={viewer.isStaff}
              />
            ))
          ) : (
            <EmptyState title="No announcements yet" />
          )}
        </div>
        {canPost ? (
          <div id="new">
            <NewAnnouncementForm committees={postCommittees} sessions={sessions ?? []} isStaff={viewer.isStaff} defaultCommittee={typeof sp.committee === "string" ? sp.committee : ""} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
