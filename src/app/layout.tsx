import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { appName, schoolName } from "@/lib/env";
import "./globals.css";

const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"], axes: ["opsz"] });
const sans = Source_Sans_3({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: `${appName}: weekly Model United Nations sessions for ${schoolName}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
