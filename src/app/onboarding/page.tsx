import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/session";
import { isAllowedSchoolEmail } from "@/lib/auth/domains";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/welcome");
  if (profile?.onboarding_completed_at) redirect("/dashboard");
  // Server-side enforcement of the verified-school-email state.
  if (!user.email || !user.email_confirmed_at || !isAllowedSchoolEmail(user.email)) redirect("/login?error=domain");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Cancel and sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-8">
        <Card className="w-full max-w-xl p-6 sm:p-8">
          <p className="eyebrow">Step 2 of 2 · {user.email}</p>
          <h1 className="mt-1 text-2xl font-semibold">Complete your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your school email is verified. Choose a username and password for everyday sign-in, and tell us who you are.
          </p>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </Card>
      </main>
    </div>
  );
}
