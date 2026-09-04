import { EmptyState } from "@/components/mun/empty-state";
import { formatBytes, formatDateTime } from "@/lib/utils";

export type UploadListItem = {
  id: string;
  title: string;
  notes: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  external_url?: string | null;
  created_at: string;
  authorName: string;
  downloadHref: string;
};

function linkHost(url: string) {
  try {
    const h = new URL(url).hostname;
    return h === "docs.google.com" ? "Google Docs" : h.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

/** Portal-style file ledger: title link, mono file name, "Submitted … · author". */
export function UploadList({ items, emptyTitle = "No uploads yet", emptyDescription, children }: {
  items: UploadListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  children?: (item: UploadListItem) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} className="empty-state-sm" />;
  return (
    <ul className="task-file-list mt-0">
      {items.map((u) => (
        <li key={u.id} className="task-file">
          <div className="task-file-meta">
            <a href={u.downloadHref} target="_blank" rel="noopener noreferrer" className="prose-link">
              <strong>{u.title}</strong>
            </a>
            <span className="muted small mono">
              {u.file_name ? `${u.file_name} · ${formatBytes(u.size_bytes ?? 0)}` : u.external_url ? linkHost(u.external_url) : ""}
            </span>
            {u.external_url ? (
              <a href={u.external_url} target="_blank" rel="noopener noreferrer" className="prose-link small break-all">
                {u.external_url}
              </a>
            ) : null}
            <div className="muted small">
              Submitted {formatDateTime(u.created_at)} · {u.authorName}
            </div>
            {u.notes ? <div className="small mt-1">{u.notes}</div> : null}
          </div>
          {children ? <div className="flex items-center gap-1">{children(u)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
