import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toActor } from "@/lib/auth/actor";
import { canManageTask } from "@/lib/policy";
import { PageHeader } from "@/components/mun/page-header";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { Card } from "@/components/ui/card";
import { TaskForm } from "../../task-form";
import { loadTaskFormData } from "../../task-form-data";

export const metadata: Metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: PageProps<"/calendar/[id]/edit">) {
  const { id } = await params;
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();
  if (!canManageTask(toActor(viewer), task)) return <PermissionDenied message="Only the responsible chair or the Secretariat can edit this task." />;
  const data = await loadTaskFormData(supabase, viewer);
  return (
    <div>
      <PageHeader eyebrow="Calendar" title={`Edit: ${task.title}`} />
      <Card className="p-6">
        <TaskForm task={task} {...data} isStaff={viewer.isStaff} />
      </Card>
    </div>
  );
}
