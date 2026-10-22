"use client";

import { useState, useEffect } from "react";
import { Session } from "@/types";
import SessionPill from "@/components/settings/SessionPill";
import UserRevokeSingleSessionModal from "@/components/settings/members/UserRevokeSingleSessionModal";
import UserRevokeAllSessionsModal from "@/components/settings/members/UserRevokeAllSessionsModal";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import AuthenticatorSettings from "@/components/settings/AuthenticatorSettings";

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const { profile } = useProfile();
  const { user } = useSupabase();

  // Update local state when user data loads
  useEffect(() => {
    getUserSessions();
  }, [profile, user]);

  async function getUserSessions() {
    // contrast to BetterAuth, Supabase doesn't expose listSessions client-side easily
    setSessions([]);
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <p className="font-semibold text-xl">Security</p>
      <div className="flex flex-row justify-between items-start w-full">
        <div className="flex flex-col justify-start items-start">
          <p className="font-medium">Sessions</p>
          <p className="text-sm text-muted-foreground">
            Devices logged into your account
          </p>
        </div>
        <UserRevokeAllSessionsModal
          name={profile?.name ?? user?.email?.split("@")[0] ?? ""}
          email={user?.email ?? ""}
        />
      </div>
      {sessions.length ? (
        sessions.map((session) => (
          <SessionPill
            key={session.id}
            ipAddress={session.ipAddress ?? ""}
            sessionId={session.id}
            sessionToken={session.token}
            createdAt={session.createdAt}
            userName={profile?.name ?? user?.email?.split("@")[0] ?? ""}
            userEmail={user?.email ?? ""}
            revokeSessionComponent={
              <UserRevokeSingleSessionModal
                sessionToken={session.token}
                name={profile?.name ?? user?.email?.split("@")[0] ?? ""}
                email={user?.email ?? ""}
              />
            }
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No sessions found</p>
      )}
      <AuthenticatorSettings />
    </div>
  );
}
