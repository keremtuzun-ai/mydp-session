import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/mun/empty-state";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Audit log" };

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const size = 50;
  const supabase = await createClient();
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  const list = logs ?? [];
  const names = await getNameMap(supabase, list.map((l) => l.actor_id));
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  return (
    <div className="flex flex-col gap-4">
      {list.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap mono text-[0.82rem] muted">{formatDateTime(l.created_at)}</TableCell>
                <TableCell>{nameOf(names, l.actor_id, "System")}</TableCell>
                <TableCell className="mono text-[0.82rem]">{l.action}</TableCell>
                <TableCell className="muted">
                  {l.entity_type}
                  {l.entity_id ? <span className="block font-mono text-[10px]">{l.entity_id}</span> : null}
                </TableCell>
                <TableCell className="max-w-xs truncate font-mono text-[11px] muted" title={JSON.stringify(l.metadata)}>
                  {JSON.stringify(l.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState title="No audit entries yet" />
      )}
      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between small">
          <a href={`?page=${Math.max(1, page - 1)}`} aria-disabled={page === 1} className="prose-link aria-disabled:pointer-events-none aria-disabled:opacity-50">
            Newer
          </a>
          <span className="muted">
            Page {page} of {pages}
          </span>
          <a href={`?page=${Math.min(pages, page + 1)}`} aria-disabled={page === pages} className="prose-link aria-disabled:pointer-events-none aria-disabled:opacity-50">
            Older
          </a>
        </nav>
      ) : null}
    </div>
  );
}
