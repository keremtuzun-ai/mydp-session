import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { Card } from "@/components/ui/card";
import { CommitteeForm } from "../committee-form";

export const metadata: Metadata = { title: "New committee" };

export default async function NewCommitteePage() {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Only executives and admins can create committees." />;
  return (
    <div>
      <PageHeader eyebrow="Committees" title="Create a committee" />
      <Card>
        <CommitteeForm />
      </Card>
    </div>
  );
}
