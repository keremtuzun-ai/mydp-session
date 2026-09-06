import type { UserRole } from "@/lib/auth/roles";

/** Icon names are resolved inside the client nav component (components cannot cross the server/client boundary). */
export type NavIcon = "dashboard" | "exec" | "tasks" | "sessions" | "materials" | "resolutions" | "announcements" | "attendance" | "analytics" | "admin" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon; roles?: UserRole[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/calendar", label: "Calendar", icon: "tasks" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/materials", label: "Materials", icon: "materials" },
  { href: "/resolutions", label: "Resolutions", icon: "resolutions" },
  { href: "/exec", label: "Exec", icon: "exec", roles: ["admin", "executive"] },
  { href: "/announcements", label: "Announcements", icon: "announcements" },
  { href: "/attendance", label: "Attendance", icon: "attendance" },
  { href: "/analytics", label: "Analytics", icon: "analytics", roles: ["admin", "executive"] },
  { href: "/admin", label: "Administration", icon: "admin", roles: ["admin", "executive"] },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function navForRole(role: UserRole) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
