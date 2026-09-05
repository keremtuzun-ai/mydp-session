import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { isSharedExecAccount } from "@/lib/auth/shared-exec";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { Card } from "@/components/ui/card";
import { TaskForm } from "../task-form";
import { loadTaskFormData } from "../task-form-data";

export const metadata: Metadata = { title: "Assign task" };

export default async function NewTaskPage({ searchParams }: PageProps<"/calendar/new">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (!viewer.isStaff && !viewer.isChair) return <PermissionDenied message="Only chairs, executives and admins can assign tasks." />;
  const supabase = await createClient();
  const data = await loadTaskFormData(supabase, viewer);
  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Assign a task" />
      <Card>
        <TaskForm {...data} isStaff={viewer.isStaff} defaultAuthor={isSharedExecAccount(viewer.profile) ? "" : viewer.profile.display_name ?? ""} defaults={{ committee: typeof sp.committee === "string" ? sp.committee : undefined, session: typeof sp.session === "string" ? sp.session : undefined }} />
      </Card>
    </div>
  );
}
