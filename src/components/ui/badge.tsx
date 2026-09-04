import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("chip", {
  variants: {
    variant: {
      default: "chip-ink",
      secondary: "",
      outline: "",
      gold: "chip-red",
      navy: "chip-navy",
      success: "chip-success",
      warning: "chip-warn",
      info: "chip-navy",
      destructive: "chip-danger",
      muted: "chip-muted",
    },
    dot: { true: "chip-dot", false: "" },
  },
  defaultVariants: { variant: "default", dot: false },
});

function Badge({ className, variant, dot, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, dot }), className)} {...props} />;
}

export { Badge, badgeVariants };
