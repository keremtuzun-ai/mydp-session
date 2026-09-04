import "server-only";
import { getViewer } from "@/lib/auth/session";
import { PermissionDenied } from "@/components/mun/permission-denied";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Server component wrapper: renders children only if the viewer's role is in
 * `roles`. Pages still fetch data through RLS, so this is a presentation
 * layer, not the authorization boundary.
 */
export async function Protected({ roles, children, message }: { roles: UserRole[]; children: React.ReactNode; message?: string }) {
  const viewer = await getViewer();
  if (!roles.includes(viewer.role)) return <PermissionDenied message={message} />;
  return <>{children}</>;
}
