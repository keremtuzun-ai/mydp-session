import { getViewer } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/mun/permission-denied";
import { PageHeader } from "@/components/mun/page-header";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) return <PermissionDenied message="Administration is reserved for admins." />;
  return (
    <div>
      <PageHeader eyebrow="Secretariat" title="Administration" description="Users, roles, committees, sessions, templates, domains and the audit log." />
      <AdminNav />
      <div className="mt-5">{children}</div>
    </div>
  );
}
