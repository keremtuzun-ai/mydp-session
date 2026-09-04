import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { Card } from "@/components/ui/card";
import { SessionForm } from "../session-form";

export const metadata: Metadata = { title: "New session" };

export default async function NewSessionPage() {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Only executives and admins can schedule sessions." />;
  return (
    <div>
      <PageHeader eyebrow="Sessions" title="Schedule a weekly session" />
      <Card>
        <SessionForm />
      </Card>
    </div>
  );
}
