import { BrandMark } from "@/components/shell/brand";

export function AuthCard({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="auth-card">
      {eyebrow ? <span className="page-kicker">{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p className="muted mt-[-0.5rem] mb-5">{description}</p> : null}
      {children}
      <div className="auth-logo">
        <BrandMark className="!h-[52px] opacity-85" />
      </div>
    </section>
  );
}
