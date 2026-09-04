import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/mun/page-header";
import { RoleBadge } from "@/components/mun/role-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, AvatarForm, PasswordForm, SessionControls } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();

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
              <CardDescription>Used together with your school email to sign in. If you forget it, an executive or admin can set a temporary one.</CardDescription>
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
                <div className="settings-row !border-b-0">
                  <dt>Role</dt>
                  <dd>
                    <RoleBadge role={viewer.role} />
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
