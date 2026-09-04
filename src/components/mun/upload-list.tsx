import { FileText, Image as ImageIcon, FileType, Download } from "lucide-react";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/mun/empty-state";

export type UploadListItem = {
  id: string;
  title: string;
  notes: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  authorName: string;
  downloadHref: string;
};

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return FileType;
}

export function UploadList({ items, emptyTitle = "No uploads yet", emptyDescription, children }: {
  items: UploadListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  children?: (item: UploadListItem) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} className="py-8" />;
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {items.map((u) => {
        const Icon = iconFor(u.mime_type);
        return (
          <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{u.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.file_name} · {formatBytes(u.size_bytes)} · {u.authorName} · {formatDateTime(u.created_at)}
              </p>
              {u.notes ? <p className="mt-1 text-sm text-muted-foreground">{u.notes}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={u.downloadHref} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" aria-hidden /> Download
                </a>
              </Button>
              {children?.(u)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
