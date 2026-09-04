import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listCommitteesWithChairs } from "@/lib/data/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteCommitteeButton } from "./delete-button";

export const metadata: Metadata = { title: "Admin · Committees" };

export default async function AdminCommitteesPage() {
  const supabase = await createClient();
  const committees = await listCommitteesWithChairs(supabase);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href="/committees/new" className="btn">New committee</Link>
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
                <Link href={`/committees/${c.slug}`} className="row-title">
                  {c.acronym}
                </Link>
                <span className="block row-sub">{c.name}</span>
              </TableCell>
              <TableCell>{c.category}</TableCell>
              <TableCell className="muted">{c.chairNames.join(", ") || "—"}</TableCell>
              <TableCell className="text-right">{c.memberCount}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={c.is_open ? "success" : "muted"} dot>{c.is_open ? "Open" : "Closed"}</Badge>
                  {c.submissions_enabled ? <Badge variant="secondary">Submissions</Badge> : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DeleteCommitteeButton id={c.id} acronym={c.acronym} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="m-0 small muted">Edit a committee&apos;s details from its workspace page.</p>
    </div>
  );
}
