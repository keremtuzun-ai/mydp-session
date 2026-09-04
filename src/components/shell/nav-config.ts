import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarDays, Landmark, ListChecks, Library, Megaphone, ClipboardCheck, BarChart3, Settings, ShieldCheck,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: UserRole[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "My tasks", icon: ListChecks },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/committees", label: "Committees", icon: Landmark },
  { href: "/materials", label: "Materials", icon: Library },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "executive"] },
  { href: "/admin", label: "Administration", icon: ShieldCheck, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function navForRole(role: UserRole) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
