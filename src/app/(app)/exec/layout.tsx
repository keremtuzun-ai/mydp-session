import { getViewer } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { PageHeader } from "@/components/mun/page-header";
import { ExecNav } from "./exec-nav";

export default async function ExecLayout({ children }: LayoutProps<"/exec">) {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="The executive section is for executives and admins." />;
  return (
    <div>
      <PageHeader eyebrow="Secretariat" title="Executive desk" description="Assign tasks, follow progress, review every submission, take attendance and manage materials." />
      <ExecNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
