import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { Card } from "@/components/ui/card";
import { SessionForm } from "../../session-form";

export const metadata: Metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: PageProps<"/sessions/[id]/edit">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Only executives and admins can edit sessions." />;
  const supabase = await createClient();
  const { data: session } = await supabase.from("weekly_sessions").select("*").eq("id", id).maybeSingle();
  if (!session) notFound();
  return (
    <div>
      <PageHeader eyebrow="Sessions" title={`Edit: ${session.title}`} />
      <Card>
        <SessionForm session={session} />
      </Card>
    </div>
  );
}
