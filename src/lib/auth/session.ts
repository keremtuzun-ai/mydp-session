import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, CommitteeMembership } from "@/lib/types/database";
import { isChairMembership, isStaffRole, type UserRole } from "@/lib/auth/roles";

export type Viewer = {
  userId: string;
  email: string;
  profile: Profile;
  memberships: CommitteeMembership[];
  chairedCommitteeIds: string[];
  memberCommitteeIds: string[];
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isChair: boolean;
};

/** Raw auth state + profile. Cached per request. */
export const getAuthState = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: profile ?? null };
});

/**
 * The fully-resolved signed-in user. Redirects to /login when signed out and
 * to /onboarding when the profile is incomplete, so protected pages can rely
 * on a complete viewer.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const { supabase, user, profile } = await getAuthState();
  if (!user) redirect("/login");
  if (!profile || !profile.onboarding_completed_at) redirect("/onboarding");

  const { data: memberships } = await supabase
    .from("committee_memberships")
    .select("*")
    .eq("profile_id", user.id);
  const list = memberships ?? [];
  return {
    userId: user.id,
    email: user.email ?? profile.school_email,
    profile,
    memberships: list,
    chairedCommitteeIds: list.filter((m) => isChairMembership(m.membership_role)).map((m) => m.committee_id),
    memberCommitteeIds: list.map((m) => m.committee_id),
    role: profile.role,
    isAdmin: profile.role === "admin",
    isStaff: isStaffRole(profile.role),
    isChair: profile.role === "chair" || list.some((m) => isChairMembership(m.membership_role)),
  };
});

export async function requireRole(...roles: UserRole[]) {
  const viewer = await getViewer();
  if (!roles.includes(viewer.role)) redirect("/dashboard?denied=1");
  return viewer;
}
