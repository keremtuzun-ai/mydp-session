"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root className={cn("relative flex size-9 shrink-0 overflow-hidden rounded-full border border-line", className)} {...props} />;
}
function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("aspect-square size-full object-cover", className)} {...props} />;
}
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return <AvatarPrimitive.Fallback className={cn("flex size-full items-center justify-center rounded-full bg-paper-2 font-mono text-[11px] font-semibold text-ink-2", className)} {...props} />;
}

export { Avatar, AvatarImage, AvatarFallback };
