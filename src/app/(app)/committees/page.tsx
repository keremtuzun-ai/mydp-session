import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listCommitteesWithChairs } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { CommitteeCard } from "@/components/mun/committee-card";
import { EmptyState } from "@/components/mun/empty-state";

export const metadata: Metadata = { title: "Committees" };

export default async function CommitteesPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const committees = await listCommitteesWithChairs(supabase);
  const mine = committees.filter((c) => viewer.memberCommitteeIds.includes(c.id));
  const others = committees.filter((c) => !viewer.memberCommitteeIds.includes(c.id));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Directory"
        title="Committees"
        description="Every committee in the programme, its chair team and whether it is open to new delegates."
        actions={
          viewer.isStaff ? (
            <Link href="/committees/new" className="btn">
              New committee
            </Link>
          ) : null
        }
      />
      {committees.length === 0 ? (
        <EmptyState title="No committees yet" description="The Secretariat has not created any committees." />
      ) : null}
      {mine.length ? (
        <section aria-labelledby="mine">
          <div className="section-head">
            <h2 id="mine">Your committees</h2>
          </div>
          <div className="cm-grid">
            {mine.map((c) => (
              <CommitteeCard key={c.id} committee={c} chairNames={c.chairNames} memberCount={c.memberCount} isMine />
            ))}
          </div>
        </section>
      ) : null}
      {others.length ? (
        <section aria-labelledby="all">
          <div className="section-head">
            <h2 id="all">{mine.length ? "Other committees" : "All committees"}</h2>
          </div>
          <div className="cm-grid">
            {others.map((c) => (
              <CommitteeCard key={c.id} committee={c} chairNames={c.chairNames} memberCount={c.memberCount} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
