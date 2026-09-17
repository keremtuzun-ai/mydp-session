import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSharedExecAccount } from "@/lib/auth/shared-exec";
import { formatAccessCode, isMemberEmail, isMemberTier, TIER_LABEL } from "@/lib/auth/access-code";
import { boardTitle } from "@/lib/board";
import { getExecSharedPassword } from "@/lib/env";
import { PageHeader } from "@/components/mun/page-header";
import { RoleBadge } from "@/components/mun/role-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, AvatarForm, SessionControls } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  const shared = isSharedExecAccount(viewer.profile);
  const supabase = await createClient();
  const { data: issued } = shared ? { data: null } : await supabase.from("access_codes").select("code").eq("profile_id", viewer.userId).maybeSingle();
  const tier = isMemberTier(viewer.profile.tier) ? TIER_LABEL[viewer.profile.tier] : null;
  const title = boardTitle(viewer.profile.username);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Account" title="Settings" />

      <div className="two-col-wide grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {shared ? (
            <Card>
              <CardHeader>
                <CardTitle>Executive account</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="m-0">
                  <div className="settings-row">
                    <dt>Username</dt>
                    <dd><span className="code-pill">{viewer.profile.username}</span></dd>
                  </div>
                  <div className="settings-row !border-b-0">
                    <dt>Password</dt>
                    <dd><span className="code-pill">{getExecSharedPassword() || "not set"}</span></dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : null}
          {shared ? null : (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Phone is visible only to the Secretariat.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={viewer.profile} />
            </CardContent>
          </Card>
          )}

          {shared ? null : (
          <Card id="security">
            <CardHeader>
              <CardTitle>Access code</CardTitle>
              <CardDescription>You sign in with this code every time. It was issued with your account and cannot be changed.</CardDescription>
            </CardHeader>
            <CardContent>
              {issued ? <span className="code-pill access-code-pill">{formatAccessCode(issued.code)}</span> : <p className="m-0 small muted">No access code has been issued for this account yet. Ask an executive.</p>}
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Sign out here or on every other device.</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionControls />
            </CardContent>
          </Card>
        </div>

        {shared ? null : (
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
                {isMemberEmail(viewer.profile.school_email) ? null : (
                  <div className="settings-row">
                    <dt>Email</dt>
                    <dd className="break-all">{viewer.profile.school_email} <span className="muted small">read-only · contact an admin to correct</span></dd>
                  </div>
                )}
                <div className="settings-row">
                  <dt>Username</dt>
                  <dd><span className="code-pill">{viewer.profile.username}</span></dd>
                </div>
                {tier ? (
                  <div className="settings-row">
                    <dt>Member</dt>
                    <dd>{tier}</dd>
                  </div>
                ) : null}
                {title ? (
                  <div className="settings-row">
                    <dt>Board</dt>
                    <dd className="board-title">{title}</dd>
                  </div>
                ) : null}
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
        )}
      </div>
    </div>
  );
}
