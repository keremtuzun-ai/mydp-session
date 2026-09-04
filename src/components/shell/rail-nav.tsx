"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { NavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

/** Sticky rail on desktop; a right-hand drawer with the hamburger on phones. */
export function RailNav({ items, meta }: { items: NavItem[]; meta: { today: string; who: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="rail">
      <div className="rail-inner">
        <nav id="primary-nav" aria-label="Primary" className={cn("rail-nav", open && "nav-open")}>
          {items.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("nav-item", active && "active")} onClick={() => setOpen(false)}>
                <span>{label}</span>
              </Link>
            );
          })}
          <div className="rail-actions">
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
        </nav>
        <button
          type="button"
          className="nav-hamburger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div className={cn("nav-overlay", open && "visible")} onClick={() => setOpen(false)} aria-hidden />
    </div>
  );
}
