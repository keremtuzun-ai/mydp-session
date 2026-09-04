"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ActionResult } from "@/lib/action-result";

type Props = Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: { title: string; description: string; confirmLabel?: string; destructive?: boolean };
  onSuccess?: () => void;
  children: ReactNode;
};

/** Runs a server action from a button with a toast for the outcome. */
export function ActionButton({ action, confirm, onSuccess, children, ...props }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action();
          if (result.ok) {
            if (result.message) toast.success(result.message);
            onSuccess?.();
            router.refresh();
          } else {
            toast.error(result.error);
          }
        } catch (err) {
          // redirect() inside an action throws a special error; let Next handle it.
          if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
          toast.error(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
          resolve();
        }
      });
    });

  if (confirm) {
    return (
      <ConfirmDialog
        trigger={
          <Button type="button" loading={pending} {...props}>
            {children}
          </Button>
        }
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        destructive={confirm.destructive ?? true}
        onConfirm={run}
      />
    );
  }
  return (
    <Button type="button" loading={pending} onClick={() => void run()} {...props}>
      {children}
    </Button>
  );
}
