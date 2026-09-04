import type { UserRole } from "@/lib/auth/roles";

/** Icon names are resolved inside the client nav component (components cannot cross the server/client boundary). */
export type NavIcon = "dashboard" | "tasks" | "sessions" | "committees" | "materials" | "announcements" | "attendance" | "analytics" | "admin" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon; roles?: UserRole[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/calendar", label: "My tasks", icon: "tasks" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/committees", label: "Committees", icon: "committees" },
  { href: "/materials", label: "Materials", icon: "materials" },
  { href: "/announcements", label: "Announcements", icon: "announcements" },
  { href: "/attendance", label: "Attendance", icon: "attendance" },
  { href: "/analytics", label: "Analytics", icon: "analytics", roles: ["admin", "executive"] },
  { href: "/admin", label: "Administration", icon: "admin", roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function navForRole(role: UserRole) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
