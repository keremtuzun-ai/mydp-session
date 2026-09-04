import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getAuthState } from "@/lib/auth/session";
import { isAllowedSchoolEmail } from "@/lib/auth/domains";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const { user, profile } = await getAuthState();
  if (!user) redirect("/welcome");
  if (profile?.onboarding_completed_at) redirect("/dashboard");
  if (!user.email || !user.email_confirmed_at || !isAllowedSchoolEmail(user.email)) redirect("/login?error=domain");

  return (
    <>
      <header className="masthead masthead-auth">
        <div className="masthead-inner">
          <Brand />
          <div className="masthead-side">
            <div className="masthead-meta">
              <span>{format(new Date(), "EEEE, d MMMM yyyy")}</span>
              <br />
              <span className="masthead-user">{user.email}</span>
            </div>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button type="submit" className="masthead-signout">
                Cancel
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="main-area">
        <div className="main-inner main-inner-auth">
          <section className="auth-card !max-w-[680px]">
            <span className="page-kicker">First-time setup · step 2 of 2</span>
            <h1>Complete your profile</h1>
            <p className="muted mt-[-0.5rem] mb-5">Your school email is verified. Choose a username and password for everyday sign-in, and tell us who you are.</p>
            <OnboardingForm />
          </section>
        </div>
      </main>
    </>
  );
}
