"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/exec", label: "Tasks & progress" },
  { href: "/exec/uploads", label: "Submissions" },
  { href: "/resolutions", label: "Resolutions" },
  { href: "/exec/attendance", label: "Attendance" },
  { href: "/materials", label: "Materials" },
  { href: "/announcements", label: "Announcements" },
];

export function ExecNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Executive sections" className="filter-pills">
      {ITEMS.map((i) => {
        const active = i.href === "/exec" ? pathname === "/exec" : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cn("filter-pill", active && "active")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
