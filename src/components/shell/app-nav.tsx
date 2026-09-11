"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  Gavel,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Settings,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { MOBILE_TABS, type NavIcon, type NavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Icon names travel across the RSC boundary; the components themselves live here. */
const ICONS: Record<NavIcon, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  dashboard: LayoutDashboard,
  tasks: ListChecks,
  sessions: CalendarDays,
  resolutions: FileText,
  exec: Gavel,
  attendance: UserCheck,
  admin: Users,
  settings: Settings,
};

function NavIconGlyph({ name }: { name: NavIcon }) {
  const Glyph = ICONS[name];
  return <Glyph className="nav-glyph" strokeWidth={1.75} />;
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * One navigation for two shapes: a left sidebar with icon + page name on
 * desktop, and a bottom tab bar with icons on phones (four tabs plus a
 * "More" sheet holding the rest, the edition switch and sign out).
 */
export function AppNav({ items, meta, brand }: { items: NavItem[]; meta: { today: string; who: string }; brand: React.ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const tabs = MOBILE_TABS.map((href) => items.find((i) => i.href === href)).filter((i): i is NavItem => Boolean(i));
  const rest = items.filter((i) => !tabs.includes(i));
  const moreActive = rest.some((i) => isActive(pathname, i.href));

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">{brand}</div>
        <nav className="side-nav" aria-label="Primary">
          {items.map(({ href, label, icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={cn("side-item", isActive(pathname, href) && "active")}>
              <NavIconGlyph name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="masthead-meta">
            <span>{meta.today}</span>
            <br />
            <span className="masthead-user">{meta.who}</span>
          </div>
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button type="submit" className="masthead-signout w-full">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-brand">{brand}</div>
        <div className="topbar-side">
          <ThemeToggle />
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {tabs.map(({ href, label, icon }) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={cn("tab-item", isActive(pathname, href) && "active")} onClick={() => setMore(false)}>
            <NavIconGlyph name={icon} />
            <span>{label}</span>
          </Link>
        ))}
        <button type="button" className={cn("tab-item", moreActive && "active")} aria-expanded={more} aria-controls="more-sheet" onClick={() => setMore((v) => !v)}>
          <MoreHorizontal className="nav-glyph" strokeWidth={1.75} />
          <span>More</span>
        </button>
      </nav>

      <div className={cn("sheet-overlay", more && "visible")} onClick={() => setMore(false)} aria-hidden />
      <div id="more-sheet" className={cn("more-sheet", more && "open")} role="dialog" aria-label="More" aria-hidden={!more}>
        <div className="more-head">
          <div className="masthead-meta">
            <span>{meta.today}</span>
            <br />
            <span className="masthead-user">{meta.who}</span>
          </div>
          <button type="button" className="more-close" aria-label="Close" onClick={() => setMore(false)}>
            <X className="nav-glyph" strokeWidth={1.75} />
          </button>
        </div>
        <div className="more-list">
          {rest.map(({ href, label, icon }) => (
            <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={cn("side-item", isActive(pathname, href) && "active")} onClick={() => setMore(false)}>
              <NavIconGlyph name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <div className="more-foot">
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button type="submit" className="masthead-signout w-full">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
