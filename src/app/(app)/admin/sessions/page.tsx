import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listSessionsWithCoverage, attendanceSummaryText } from "@/lib/data/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SessionStatusBadge } from "@/components/mun/session-status-badge";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Sessions" };

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const sessions = await listSessionsWithCoverage(supabase, { order: "desc" });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="/sessions/new" className="btn">New session</Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>When</TableHead>
            <TableHead>Committees</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link href={`/sessions/${s.id}`} className="row-title">
                  {s.title}
                </Link>
                {s.theme ? <span className="block row-sub">{s.theme}</span> : null}
              </TableCell>
              <TableCell className="muted">{formatDateTime(s.starts_at)}</TableCell>
              <TableCell>{s.committees.map((c) => c.acronym).join(", ") || "—"}</TableCell>
              <TableCell className="muted">{attendanceSummaryText(s.attendance) || "—"}</TableCell>
              <TableCell>
                <SessionStatusBadge status={s.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/sessions/${s.id}/edit`}>
                    <Pencil className="size-4" aria-hidden /> Edit
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
