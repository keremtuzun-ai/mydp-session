import { getViewer } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { PageHeader } from "@/components/mun/page-header";
import { ExecNav } from "../exec/exec-nav";

/** Administration is part of the executive desk: same header, same row of sections. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Administration is reserved for the admin and the executive desk." />;
  return (
    <div>
      <PageHeader eyebrow="Secretariat" title="Executive desk" />
      <ExecNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
