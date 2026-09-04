import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/sessions/new">
            <Plus className="size-4" aria-hidden /> New session
          </Link>
        </Button>
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
                <Link href={`/sessions/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                  {s.title}
                </Link>
                {s.theme ? <span className="block text-xs text-muted-foreground">{s.theme}</span> : null}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(s.starts_at)}</TableCell>
              <TableCell>{s.committees.map((c) => c.acronym).join(", ") || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{attendanceSummaryText(s.attendance) || "—"}</TableCell>
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
      <p className="text-xs text-muted-foreground">Announcements and materials are managed from their own pages; admins and executives can delete any item there.</p>
    </div>
  );
}
