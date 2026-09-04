"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flash flash-navy flex items-center gap-3 w-[356px] shadow-[var(--shadow-pop)]",
          success: "flash-success",
          error: "flash-error",
          warning: "flash-warning",
          title: "font-semibold",
          description: "muted small",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
