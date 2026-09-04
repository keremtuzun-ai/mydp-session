import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listCommitteesWithChairs } from "@/lib/data/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteCommitteeButton } from "./delete-button";

export const metadata: Metadata = { title: "Admin · Committees" };

export default async function AdminCommitteesPage() {
  const supabase = await createClient();
  const committees = await listCommitteesWithChairs(supabase);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/committees/new">
            <Plus className="size-4" aria-hidden /> New committee
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Committee</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Chairs</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {committees.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/committees/${c.slug}`} className="font-medium underline-offset-4 hover:underline">
                  {c.acronym}
                </Link>
                <span className="block text-xs text-muted-foreground">{c.name}</span>
              </TableCell>
              <TableCell>{c.category}</TableCell>
              <TableCell className="text-muted-foreground">{c.chairNames.join(", ") || "—"}</TableCell>
              <TableCell className="text-right">{c.memberCount}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={c.is_open ? "success" : "muted"}>{c.is_open ? "Open" : "Closed"}</Badge>
                  {c.submissions_enabled ? <Badge variant="outline">Submissions</Badge> : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DeleteCommitteeButton id={c.id} acronym={c.acronym} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">Edit a committee&apos;s details from its workspace page.</p>
    </div>
  );
}
