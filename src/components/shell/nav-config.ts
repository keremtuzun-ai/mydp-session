import type { UserRole } from "@/lib/auth/roles";

/** Icon names are resolved inside the client nav component (components cannot cross the server/client boundary). */
export type NavIcon = "dashboard" | "exec" | "tasks" | "sessions" | "materials" | "resolutions" | "announcements" | "attendance" | "analytics" | "admin" | "settings";
export type NavItem = { href: string; label: string; icon: NavIcon; roles?: UserRole[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/calendar", label: "Tasks", icon: "tasks" },
  { href: "/sessions", label: "Sessions", icon: "sessions" },
  { href: "/resolutions", label: "Resolutions", icon: "resolutions" },
  { href: "/materials", label: "Materials", icon: "materials" },
  { href: "/announcements", label: "Announcements", icon: "announcements" },
  { href: "/exec", label: "Exec desk", icon: "exec", roles: ["admin", "executive"] },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Everything the executive desk does, as one row of pills under the desk header. */
export const EXEC_SECTIONS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/exec", label: "Tasks & progress", exact: true },
  { href: "/exec/uploads", label: "Submissions" },
  { href: "/exec/attendance", label: "Attendance" },
  { href: "/analytics", label: "Analytics" },
  { href: "/admin", label: "Members", exact: true },
  { href: "/admin/sessions", label: "Session setup" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/audit", label: "Audit log" },
];

export function navForRole(role: UserRole) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}
