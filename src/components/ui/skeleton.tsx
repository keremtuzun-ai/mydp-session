import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-[5px] bg-paper-2", className)} {...props} />;
}

export { Skeleton };
