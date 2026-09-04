import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function UserChip({ name, username, avatarUrl, size = "sm" }: { name: string | null; username?: string | null; avatarUrl?: string | null; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar className={size === "sm" ? "size-6" : "size-8"}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className={size === "sm" ? "text-[9px]" : "text-[11px]"}>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="leading-tight">
        <span className="block text-sm">{name ?? "Unnamed"}</span>
        {username ? <span className="block text-[11px] text-muted-foreground">@{username}</span> : null}
      </span>
    </span>
  );
}
