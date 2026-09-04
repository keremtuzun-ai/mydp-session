import { fmt } from "@/lib/utils";
import { Brand } from "@/components/shell/brand";
import { RailNav } from "@/components/shell/rail-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { navForRole } from "@/components/shell/nav-config";
import type { Viewer } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/auth/roles";

/** Masthead + sticky rail + editorial main column, per the MUNDP portal. */
export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const items = navForRole(viewer.role);
  const who = `${ROLE_LABEL[viewer.role]} · ${viewer.profile.username ?? viewer.profile.display_name ?? ""}`;
  const today = fmt(new Date(), "EEEE, d MMMM yyyy");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[300] focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="masthead">
        <div className="masthead-inner">
          <Brand href="/dashboard" />
          <div className="masthead-side">
            <div className="masthead-meta">
              <span>{today}</span>
              <br />
              <span className="masthead-user">{who}</span>
            </div>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button type="submit" className="masthead-signout">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <RailNav items={items} meta={{ today, who }} />
      <main id="main" className="main-area">
        <div className="main-inner">{children}</div>
      </main>
    </>
  );
}
