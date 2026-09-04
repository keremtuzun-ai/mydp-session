import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function UserChip({ name, username, avatarUrl, size = "sm" }: { name: string | null; username?: string | null; avatarUrl?: string | null; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Avatar className={size === "sm" ? "size-7" : "size-9"}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className={size === "sm" ? "text-[9px]" : "text-[11px]"}>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="leading-tight">
        <span className="block font-[650] text-[0.9rem]">{name ?? "Unnamed"}</span>
        {username ? <span className="block mono text-[0.72rem] faint">{username}</span> : null}
      </span>
    </span>
  );
}
