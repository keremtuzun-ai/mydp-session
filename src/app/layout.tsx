import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { appName, schoolName } from "@/lib/env";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700", "800"], variable: "--font-manrope", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], style: ["italic"], weight: ["400"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: `${appName}: weekly Model United Nations sessions for ${schoolName}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${manrope.variable} ${playfair.variable}`}>
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
