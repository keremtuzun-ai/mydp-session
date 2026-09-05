import { getViewer } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { PageHeader } from "@/components/mun/page-header";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer.isStaff) return <PermissionDenied message="Administration is reserved for the admin and the executive desk." />;
  return (
    <div>
      <PageHeader eyebrow="Secretariat" title="Administration" />
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
