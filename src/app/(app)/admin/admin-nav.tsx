"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Users & roles" },
  { href: "/admin/committees", label: "Committees" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/templates", label: "Task templates" },
  { href: "/admin/domains", label: "School domains" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration sections" className="filter-pills">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("filter-pill", active && "active")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
