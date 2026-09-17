import { fmt } from "@/lib/utils";
import { Brand } from "@/components/shell/brand";
import { AppNav } from "@/components/shell/app-nav";
import { navForRole } from "@/components/shell/nav-config";
import type { Viewer } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { boardTitle } from "@/lib/board";

/** Left sidebar on desktop, bottom tab bar on phones, editorial main column. */
export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const items = navForRole(viewer.role);
  // Board members are introduced by their title rather than by their role.
  const standing = boardTitle(viewer.profile.username) ?? ROLE_LABEL[viewer.role];
  const who = `${standing} · ${viewer.profile.username ?? viewer.profile.display_name ?? ""}`;
  const today = fmt(new Date(), "EEEE, d MMMM yyyy");
  return (
    <div className="shell">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[300] focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppNav items={items} meta={{ today, who }} brand={<Brand href="/dashboard" compact />} />
      <div className="shell-main">
        <main id="main" className="main-area">
          <div className="main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
