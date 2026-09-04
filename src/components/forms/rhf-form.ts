"use client";

import { startTransition, useRef, type FormEvent, type RefObject } from "react";
import type { FieldValues, UseFormHandleSubmit } from "react-hook-form";

/**
 * Bridges React Hook Form (client validation) with a useActionState
 * dispatcher (server action taking FormData). The DOM form is the source of
 * truth for what gets sent, so file inputs and hidden fields travel too.
 */
export function useRhfAction<T extends FieldValues>(handleSubmit: UseFormHandleSubmit<T>, dispatch: (fd: FormData) => void) {
  const formRef = useRef<HTMLFormElement>(null) as RefObject<HTMLFormElement>;
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    void handleSubmit(() => {
      startTransition(() => dispatch(new FormData(form)));
    })(e);
  };
  return { formRef, onSubmit };
}

export function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
