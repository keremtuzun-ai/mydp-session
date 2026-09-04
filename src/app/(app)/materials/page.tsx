import type { Metadata } from "next";
import { Library } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { PageHeader } from "@/components/mun/page-header";
import { EmptyState } from "@/components/mun/empty-state";
import { MaterialsBrowser, NewMaterialDialog } from "./materials-client";

export const metadata: Metadata = { title: "Materials" };

export default async function MaterialsPage({ searchParams }: PageProps<"/materials">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: materials }, { data: committees }, { data: sessions }] = await Promise.all([
    supabase.from("materials").select("*").order("created_at", { ascending: false }),
    supabase.from("committees").select("id, acronym, name").order("acronym"),
    supabase.from("weekly_sessions").select("id, title, starts_at").order("starts_at", { ascending: false }),
  ]);
  const list = materials ?? [];
  const names = await getNameMap(supabase, list.map((m) => m.uploaded_by));
  const canUpload = viewer.isStaff || viewer.isChair;
  const uploadCommittees = viewer.isStaff ? committees ?? [] : (committees ?? []).filter((c) => viewer.chairedCommitteeIds.includes(c.id));

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Materials"
        description="Study guides, rules of procedure, topic briefs, templates, slides and recordings."
        actions={canUpload ? <NewMaterialDialog committees={uploadCommittees} sessions={sessions ?? []} isStaff={viewer.isStaff} /> : null}
      />
      {list.length ? (
        <MaterialsBrowser
          items={list.map((m) => ({ ...m, uploaderName: nameOf(names, m.uploaded_by), canDelete: m.uploaded_by === viewer.userId || viewer.isStaff || viewer.chairedCommitteeIds.includes(m.committee_id ?? "") }))}
          committees={committees ?? []}
          sessions={sessions ?? []}
          initial={{ committee: typeof sp.committee === "string" ? sp.committee : "", session: typeof sp.session === "string" ? sp.session : "", category: typeof sp.category === "string" ? sp.category : "", type: "", q: "" }}
        />
      ) : (
        <EmptyState icon={Library} title="The library is empty" description={canUpload ? "Upload the first study guide or rules document." : "Materials shared with you will appear here."} />
      )}
    </div>
  );
}
