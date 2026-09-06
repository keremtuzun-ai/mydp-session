import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResolutionDoc, listDelegationGroups, listPublishedResolutions, type ResolutionDoc } from "@/lib/data/resolutions";
import { delegationKey, previewKind, sanitizeDocHtml } from "@/lib/resolutions";
import { uuid } from "@/lib/validation/schemas";
import { PageHeader } from "@/components/mun/page-header";
import { DocumentViewer } from "../document-viewer";
import { VotingPanel } from "../voting-panel";
import { fmt } from "@/lib/utils";

export const metadata: Metadata = { title: "Resolution" };

async function docxToHtml(storagePath: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("task-evidence").download(storagePath);
    if (error || !data) return null;
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer: Buffer.from(await data.arrayBuffer()) });
    return sanitizeDocHtml(result.value);
  } catch {
    return null;
  }
}

export default async function ResolutionPage({ params, searchParams }: PageProps<"/resolutions/[key]">) {
  const { key: raw } = await params;
  const sp = await searchParams;
  const key = delegationKey(decodeURIComponent(raw));
  const viewer = await getViewer();
  const supabase = await createClient();

  let doc: ResolutionDoc | null = null;
  let delegation = "";
  let shared: string | null = null;
  let isPublished = false;

  if (viewer.isStaff) {
    const groups = await listDelegationGroups(supabase);
    const group = groups.find((g) => g.key === key);
    if (!group) notFound();
    delegation = group.delegation;
    const wanted = typeof sp.upload === "string" && uuid.safeParse(sp.upload).success ? sp.upload : null;
    doc = (wanted ? group.docs.find((d) => d.uploadId === wanted) ?? (await getResolutionDoc(supabase, wanted)) : null) ?? group.published ?? group.docs[0] ?? null;
    isPublished = Boolean(group.published && doc && group.published.uploadId === doc.uploadId);
    shared = isPublished ? group.publishedAt : null;
  } else {
    const published = await listPublishedResolutions(supabase);
    const p = published.find((x) => x.key === key);
    if (!p) notFound();
    delegation = p.delegation;
    doc = p.doc;
    shared = p.publishedAt;
    isPublished = true;
  }
  if (!doc || !doc.storagePath) notFound();

  const kind = previewKind(doc.mime);
  const docxHtml = kind === "docx" ? await docxToHtml(doc.storagePath) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Resolution · ${delegation}`}
        title={doc.title}
        description={`Submitted by ${doc.authorName} for “${doc.taskTitle}” on ${fmt(doc.createdAt, "d MMMM yyyy, HH:mm")}.`}
        actions={
          <>
            {viewer.isStaff ? (
              <span className={isPublished ? "chip chip-navy" : "chip"}>{isPublished ? `Visible to delegates${shared ? ` since ${fmt(shared, "d MMM HH:mm")}` : ""}` : "Hidden from delegates"}</span>
            ) : null}
            <Link href="/resolutions" className="btn btn-outline btn-sm">
              All resolutions
            </Link>
          </>
        }
      />
      {isPublished ? (
        <section className="card card-tight" aria-label="Voting">
          <VotingPanel delegationKey={key} delegation={delegation} canManage={viewer.isStaff} canVote={!viewer.isStaff} />
        </section>
      ) : null}
      <DocumentViewer uploadId={doc.uploadId} kind={kind} fileName={doc.fileName} docxHtml={docxHtml} />
    </div>
  );
}
