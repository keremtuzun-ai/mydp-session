import { Brand } from "@/components/shell/brand";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { navForRole } from "@/components/shell/nav-config";
import { RoleBadge } from "@/components/mun/role-badge";
import type { Viewer } from "@/lib/auth/session";
import { schoolName } from "@/lib/env";

export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const items = navForRole(viewer.role);
  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/70 backdrop-blur lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Brand href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={items} />
        </div>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{schoolName}</p>
          <p>Model United Nations programme</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
          <MobileNav items={items} />
          <div className="lg:hidden">
            <Brand href="/dashboard" compact />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RoleBadge role={viewer.role} className="hidden sm:inline-flex" />
            <ThemeToggle />
            <UserMenu
              name={viewer.profile.display_name}
              username={viewer.profile.username}
              email={viewer.email}
              avatarUrl={viewer.profile.avatar_url}
            />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
