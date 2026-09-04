import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/mun/page-header";
import { RoleBadge, MembershipBadge } from "@/components/mun/role-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, AvatarForm, PasswordForm, SessionControls } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: committees } = await supabase.from("committees").select("id, acronym, name").in("id", viewer.memberCommitteeIds.length ? viewer.memberCommitteeIds : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, sign-in details and active sessions." />

      <div className="two-col-wide grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your name and grade are visible to your committee. Your phone number is visible only to chairs and the Secretariat.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={viewer.profile} />
            </CardContent>
          </Card>

          <Card id="security">
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Used together with your username to sign in. You can always sign in with an emailed code instead.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Sign out here, or sign out every other device that is signed in to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionControls />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <AvatarForm avatarUrl={viewer.profile.avatar_url} name={viewer.profile.display_name} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Managed by the Secretariat.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="m-0">
                <div className="settings-row">
                  <dt>School email</dt>
                  <dd className="break-all">{viewer.profile.school_email} <span className="muted small">read-only · contact an admin to correct</span></dd>
                </div>
                <div className="settings-row">
                  <dt>Username</dt>
                  <dd><span className="code-pill">{viewer.profile.username}</span></dd>
                </div>
                <div className="settings-row">
                  <dt>Role</dt>
                  <dd>
                    <RoleBadge role={viewer.role} />
                  </dd>
                </div>
                <div className="settings-row !border-b-0">
                  <dt>Committees</dt>
                  <dd className="flex flex-col gap-1">
                    {viewer.memberships.length ? (
                      viewer.memberships.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2">
                          <span>{committees?.find((c) => c.id === m.committee_id)?.acronym ?? "—"}</span>
                          <MembershipBadge role={m.membership_role} />
                        </div>
                      ))
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
