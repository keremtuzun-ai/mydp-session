import * as React from "react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn("input", className)} {...props}>
      {children}
    </select>
  );
}

export { NativeSelect };
