import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toActor } from "@/lib/auth/actor";
import { canManageResolution } from "@/lib/policy";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { ResolutionLedger, type ResolutionRow } from "@/components/mun/resolution-ledger";
import { ResolutionForm } from "@/components/mun/resolution-form";
import { EmptyState } from "@/components/mun/empty-state";

export const metadata: Metadata = { title: "Resolutions" };

export default async function ResolutionsPage() {
  const viewer = await getViewer();
  const actor = toActor(viewer);
  const supabase = await createClient();

  const [{ data: links }, { data: committees }, { data: memberships }] = await Promise.all([
    supabase.from("resolution_links").select("*").order("updated_at", { ascending: false }),
    supabase.from("committees").select("id, acronym, name, slug").order("acronym"),
    supabase.from("committee_memberships").select("profile_id, committee_id, delegation"),
  ]);
  const list = links ?? [];
  const names = await getNameMap(supabase, list.map((l) => l.profile_id));
  const committeeMap = new Map((committees ?? []).map((c) => [c.id, c]));
  const delegationOf = (pid: string, cid: string) => (memberships ?? []).find((m) => m.profile_id === pid && m.committee_id === cid)?.delegation ?? null;

  const rows: ResolutionRow[] = list.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.url,
    kind: l.kind,
    notes: l.notes,
    updated_at: l.updated_at,
    authorName: nameOf(names, l.profile_id),
    delegation: delegationOf(l.profile_id, l.committee_id),
    committeeAcronym: committeeMap.get(l.committee_id)?.acronym,
    canManage: canManageResolution(actor, l),
  }));

  const postable = (committees ?? []).filter((c) => viewer.isStaff || viewer.memberCommitteeIds.includes(c.id) || viewer.chairedCommitteeIds.includes(c.id));
  const groups = Array.from(new Set(rows.map((r) => r.committeeAcronym ?? "—"))).map((acr) => ({ acr, rows: rows.filter((r) => (r.committeeAcronym ?? "—") === acr) }));

  return (
    <>
      <PageHeader
        title="Resolutions"
        description="Working papers, draft resolutions and amendments shared as document links. Everyone in the committee can open them; chairs review them here."
      />
      <div className="two-col-wide grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {rows.length === 0 ? (
            <section className="card">
              <EmptyState title="No documents shared yet" description={postable.length ? "Share the link to your Google Doc from the form." : "You are not in a committee yet."} className="empty-state-sm" />
            </section>
          ) : (
            groups.map((g) => (
              <section key={g.acr} className="card">
                <div className="section-head">
                  <h2>{g.acr}</h2>
                  <span className="tab-count">{g.rows.length}</span>
                  <span className="section-tail">{committeeMap.get((committees ?? []).find((c) => c.acronym === g.acr)?.id ?? "")?.name}</span>
                </div>
                <ResolutionLedger rows={g.rows} />
              </section>
            ))
          )}
        </div>
        {postable.length ? <ResolutionForm committees={postable} defaultCommitteeId={viewer.memberCommitteeIds[0]} /> : null}
      </div>
    </>
  );
}
