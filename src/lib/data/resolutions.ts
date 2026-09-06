import "server-only";
import { getNameMap, nameOf, type Db } from "@/lib/data/queries";
import { delegationKey, displayDelegation, isNoDelegation } from "@/lib/resolutions";

export type ResolutionDoc = {
  uploadId: string;
  title: string;
  fileName: string | null;
  mime: string | null;
  sizeBytes: number | null;
  storagePath: string | null;
  externalUrl: string | null;
  createdAt: string;
  authorName: string;
  delegation: string;
  taskId: string;
  taskTitle: string;
};

export type DelegationGroup = {
  key: string;
  delegation: string;
  docs: ResolutionDoc[];
  published: ResolutionDoc | null;
  publishedAt: string | null;
};

type UploadRow = {
  id: string;
  task_id: string;
  uploaded_by: string;
  title: string;
  delegation: string | null;
  storage_path: string | null;
  external_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

async function toDocs(db: Db, rows: UploadRow[]): Promise<ResolutionDoc[]> {
  if (rows.length === 0) return [];
  const taskIds = Array.from(new Set(rows.map((r) => r.task_id)));
  const [names, { data: tasks }] = await Promise.all([getNameMap(db, rows.map((r) => r.uploaded_by)), db.from("tasks").select("id, title").in("id", taskIds)]);
  const taskTitle = new Map((tasks ?? []).map((t) => [t.id, t.title]));
  return rows.map((r) => ({
    uploadId: r.id,
    title: r.title,
    fileName: r.file_name,
    mime: r.mime_type,
    sizeBytes: r.size_bytes,
    storagePath: r.storage_path,
    externalUrl: r.external_url,
    createdAt: r.created_at,
    authorName: nameOf(names, r.uploaded_by),
    delegation: displayDelegation(r.delegation ?? ""),
    taskId: r.task_id,
    taskTitle: taskTitle.get(r.task_id) ?? "Task",
  }));
}

/**
 * Every delegation that has submitted a file, newest submission first, with
 * the document the desk currently shows to delegates (if any). Reads as the
 * viewer, so delegates only see their own and the published rows; the desk
 * sees everything.
 */
export async function listDelegationGroups(db: Db): Promise<DelegationGroup[]> {
  const [{ data: uploads }, { data: pubs }] = await Promise.all([
    db.from("task_uploads").select("id, task_id, uploaded_by, title, delegation, storage_path, external_url, file_name, mime_type, size_bytes, created_at").not("storage_path", "is", null).order("created_at", { ascending: false }),
    db.from("resolution_publications").select("*"),
  ]);
  const rows = (uploads ?? []).filter((u) => !isNoDelegation(u.delegation));
  const docs = await toDocs(db, rows);
  const pubByKey = new Map((pubs ?? []).map((p) => [p.delegation_key, p]));
  const groups = new Map<string, DelegationGroup>();
  for (const d of docs) {
    const key = delegationKey(d.delegation);
    const g = groups.get(key) ?? { key, delegation: d.delegation, docs: [], published: null, publishedAt: null };
    g.docs.push(d);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const p = pubByKey.get(g.key);
    if (p) {
      g.published = g.docs.find((d) => d.uploadId === p.upload_id) ?? null;
      g.publishedAt = g.published ? p.published_at : null;
      g.delegation = displayDelegation(p.delegation);
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.delegation.localeCompare(b.delegation, "en"));
}

export type PublishedResolution = { key: string; delegation: string; publishedAt: string; doc: ResolutionDoc };

/** Delegations the desk has made visible, alphabetically. */
export async function listPublishedResolutions(db: Db): Promise<PublishedResolution[]> {
  const { data: pubs } = await db.from("resolution_publications").select("*").order("delegation");
  const list = pubs ?? [];
  if (list.length === 0) return [];
  const { data: uploads } = await db
    .from("task_uploads")
    .select("id, task_id, uploaded_by, title, delegation, storage_path, external_url, file_name, mime_type, size_bytes, created_at")
    .in("id", list.map((p) => p.upload_id));
  const docs = await toDocs(db, uploads ?? []);
  const byId = new Map(docs.map((d) => [d.uploadId, d]));
  return list
    .map((p) => {
      const doc = byId.get(p.upload_id);
      return doc ? { key: p.delegation_key, delegation: displayDelegation(p.delegation), publishedAt: p.published_at, doc } : null;
    })
    .filter((x): x is PublishedResolution => x !== null);
}

/** One upload as a resolution document (RLS decides whether the viewer may see it). */
export async function getResolutionDoc(db: Db, uploadId: string): Promise<ResolutionDoc | null> {
  const { data } = await db
    .from("task_uploads")
    .select("id, task_id, uploaded_by, title, delegation, storage_path, external_url, file_name, mime_type, size_bytes, created_at")
    .eq("id", uploadId)
    .maybeSingle();
  if (!data) return null;
  const [doc] = await toDocs(db, [data]);
  return doc ?? null;
}
