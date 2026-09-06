"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXEC_SECTIONS } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export function ExecNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Executive sections" className="filter-pills">
      {EXEC_SECTIONS.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cn("filter-pill", active && "active")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
