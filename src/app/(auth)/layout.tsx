import { fmt } from "@/lib/utils";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { schoolName } from "@/lib/env";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="masthead masthead-auth">
        <div className="masthead-inner">
          <Brand />
          <div className="masthead-side">
            <div className="masthead-meta">
              <span>{fmt(new Date(), "EEEE, d MMMM yyyy")}</span>
              <br />
              <span className="masthead-user">{schoolName}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="main-area">
        <div className="main-inner main-inner-auth">{children}</div>
      </main>
    </>
  );
}
