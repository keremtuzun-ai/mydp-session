"use client";

import { useTheme } from "next-themes";

/** Day / Night edition switch, folio style. Both labels render; CSS shows the right one. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      className={`theme-toggle ${className ?? ""}`}
      title="Switch edition"
      aria-label="Switch between day and night edition"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <span className="tt-dot" aria-hidden />
      <span className="tt-day">Day</span>
      <span className="tt-night">Night</span>
    </button>
  );
}
