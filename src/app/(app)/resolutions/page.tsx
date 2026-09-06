import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listDelegationGroups, listPublishedResolutions } from "@/lib/data/resolutions";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { DelegationBoard } from "./delegation-board";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Resolutions" };

export default async function ResolutionsPage() {
  const viewer = await getViewer();
  const supabase = await createClient();

  if (viewer.isStaff) {
    const groups = await listDelegationGroups(supabase);
    const visible = groups.filter((g) => g.published).length;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Secretariat"
          title="Resolutions"
          description="Every delegation that has submitted a document. Press a delegation to make its resolution readable by all delegates; press again to hide it. Everything is hidden until you choose."
          actions={<span className="chip chip-navy">{visible} of {groups.length} visible</span>}
        />
        {groups.length === 0 ? (
          <section className="card">
            <EmptyState title="No delegations yet" description="Delegations appear here as soon as a member submits a file for one." className="empty-state-sm" />
          </section>
        ) : (
          <DelegationBoard
            groups={groups.map((g) => ({
              key: g.key,
              delegation: g.delegation,
              publishedAt: g.publishedAt,
              published: g.published ? pick(g.published) : null,
              docs: g.docs.map(pick),
            }))}
          />
        )}
      </div>
    );
  }

  const published = await listPublishedResolutions(supabase);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Committee" title="Resolutions" description="Resolutions the executive desk has opened for reading. Choose a delegation to read its document here and, when the desk opens voting, cast your vote." />
      {published.length === 0 ? (
        <section className="card">
          <EmptyState title="No resolutions shared yet" description="The executive desk decides which delegations' resolutions are visible. Check back after the session." className="empty-state-sm" />
        </section>
      ) : (
        <div className="delegation-grid">
          {published.map((p) => (
            <Link key={p.key} href={`/resolutions/${encodeURIComponent(p.key)}`} className="card delegation-card delegation-link">
              <span className="delegation-name">{p.delegation}</span>
              {p.voting === "open" ? <span className="chip chip-red self-start">Voting open</span> : p.voting === "closed" ? <span className="chip chip-navy self-start">Voting closed</span> : null}
              <span className="small muted">
                {p.doc.title} · {p.doc.authorName}
              </span>
              <span className="small muted">Shared {fmt(p.publishedAt, "d MMM yyyy, HH:mm")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function pick(d: { uploadId: string; title: string; fileName: string | null; createdAt: string; authorName: string; taskTitle: string }) {
  return { uploadId: d.uploadId, title: d.title, fileName: d.fileName, createdAt: d.createdAt, authorName: d.authorName, taskTitle: d.taskTitle };
}
