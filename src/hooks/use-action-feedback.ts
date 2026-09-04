"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/** Toasts the outcome of a useActionState result whenever it changes. */
export function useActionFeedback(state: ActionResult<unknown> | null, onSuccess?: () => void) {
  const last = useRef<ActionResult<unknown> | null>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);
}

export function fieldError(state: ActionResult<unknown> | null, field: string): string | undefined {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[field]?.[0];
}
