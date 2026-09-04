import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Plus } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listCommitteesWithChairs } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { CommitteeCard } from "@/components/mun/committee-card";
import { EmptyState } from "@/components/mun/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Committees" };

export default async function CommitteesPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const committees = await listCommitteesWithChairs(supabase);
  const mine = committees.filter((c) => viewer.memberCommitteeIds.includes(c.id));
  const others = committees.filter((c) => !viewer.memberCommitteeIds.includes(c.id));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Directory"
        title="Committees"
        description="Every committee in the programme, its chair team and whether it is open to new delegates."
        actions={
          viewer.isStaff ? (
            <Button asChild>
              <Link href="/committees/new">
                <Plus className="size-4" aria-hidden /> New committee
              </Link>
            </Button>
          ) : null
        }
      />
      {committees.length === 0 ? (
        <EmptyState icon={Landmark} title="No committees yet" description="The Secretariat has not created any committees." />
      ) : null}
      {mine.length ? (
        <section aria-labelledby="mine">
          <h2 id="mine" className="eyebrow mb-3">
            Your committees
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((c) => (
              <CommitteeCard key={c.id} committee={c} chairNames={c.chairNames} memberCount={c.memberCount} isMine />
            ))}
          </div>
        </section>
      ) : null}
      {others.length ? (
        <section aria-labelledby="all">
          <h2 id="all" className="eyebrow mb-3">
            {mine.length ? "Other committees" : "All committees"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {others.map((c) => (
              <CommitteeCard key={c.id} committee={c} chairNames={c.chairNames} memberCount={c.memberCount} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
