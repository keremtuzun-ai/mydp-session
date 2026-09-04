import type { Metadata } from "next";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { appName, schoolName } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: `${appName}: weekly Model United Nations sessions for ${schoolName}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange value={{ light: "light", dark: "dark" }}>
          <div className="ambient-waves" aria-hidden />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
