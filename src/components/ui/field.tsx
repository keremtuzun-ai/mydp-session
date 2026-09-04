import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = { label: string; htmlFor: string; error?: string; hint?: string; optional?: boolean; className?: string; children: React.ReactNode };

/** Caps label above the control, with hint and error slots wired for screen readers. */
export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-[7px]", className)}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional ? <span className="field-help">Optional</span> : null}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="field-help">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flash flash-error">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="flash flash-success">
      {message}
    </div>
  );
}
