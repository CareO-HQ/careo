"use client";

import { authClient } from "@/lib/auth-client";
import { useQueryState } from "nuqs";
import { useEffect, useState, useCallback } from "react";
import {
  Session,
  SessionWithLocation,
  LocationInfo,
  formatHoursOnly
} from "@/types";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getLocationByIP } from "@/lib/settings/location";
import RevokeSingleSessionModal from "@/components/settings/members/RevokeSingleSessionModal";
import RevokeAllSessionsModal from "@/components/settings/members/RevokeAllSessionsModal";

// Helper function to format location display
export const formatLocationDisplay = (
  location: LocationInfo | null | undefined
): string => {
  if (!location) return "Loading location...";

  const parts = [];
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(", ") : "Unknown location";
};

export default function SessionPage() {
  const [email] = useQueryState("email");
  const [userId] = useQueryState("userId");
  const [sessions, setSessions] = useState<SessionWithLocation[]>([]);
  const { data: member, isPending } = authClient.useActiveMember();
  const { data: currentSession } = authClient.useSession();

  const user = useQuery(api.user.getUserByEmail, {
    email: email || ""
  });

  const fetchLocationsForSessions = useCallback(async (sessions: Session[]) => {
    // Process sessions sequentially to avoid rate limiting
    const updatedSessions: SessionWithLocation[] = [];

    for (const session of sessions) {
      let locationData: LocationInfo | null = null;

      if (session.ipAddress) {
        try {
          locationData = await getLocationByIP(session.ipAddress);
        } catch (error) {
          console.error(
            `Failed to get location for IP ${session.ipAddress}:`,
            error
          );
        }
      }

      updatedSessions.push({
        ...session,
        location: locationData
      });

      // Add a small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setSessions(updatedSessions);
  }, []);

  const getUserSessions = useCallback(async () => {
    if (!email || !userId) return;

    const { data } = await authClient.admin.listUserSessions({
      userId: userId
    });

    if (data?.sessions) {
      // First set sessions without location data
      const initialSessions = data.sessions.map((session) => ({
        ...session,
        location: null
      }));
      setSessions(initialSessions);

      // Then fetch location data for each session
      await fetchLocationsForSessions(data.sessions);
    }
  }, [email, userId, fetchLocationsForSessions]);

  useEffect(() => {
    getUserSessions();
  }, [isPending, getUserSessions]);

  if (isPending) {
    // TODO: Improve loading state
    return <div>Loading...</div>;
  }

  if (member?.role !== "owner" && member?.role !== "admin") {
    return <div>You are not authorized to access this page</div>;
  }

  return (
    <div className="flex flex-col justify-start items-start gap-8">
      <div className="flex flex-col justify-start items-start">
        <p className="font-semibold text-xl">{user?.name}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <div className="flex flex-col justify-start items-start gap-4 w-full">
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-col justify-start items-start">
            <p className="font-medium">Sessions</p>
            <p className="text-xs text-muted-foreground">
              Devices logged into this account
            </p>
          </div>
          <RevokeAllSessionsModal
            userId={userId!}
            name={user?.name || ""}
            email={user?.email || ""}
            sessionsCount={sessions.length}
          />
        </div>
        <div className="flex flex-col justify-start items-start gap-4 w-full">
          {sessions.length ? (
            sessions.map((session: SessionWithLocation) => (
              <div
                className="flex flex-row justify-between items-center w-full gap-4"
                key={session.id}
              >
                <div className="flex flex-row justify-start items-center gap-3">
                  <div className="flex items-center justify-center h-8 w-8 bg-muted rounded-lg"></div>
                  <div className="flex flex-col justify-start items-start">
                    <div className="flex flex-row justify-start items-center gap-2">
                      <p className="text-sm font-medium">{session.ipAddress}</p>
                      {session.id === currentSession?.session.id && (
                        <p className="text-xs text-muted-foreground">
                          Current session
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatLocationDisplay(session.location ?? null)}
                      <span className="ml-2">
                        Created {formatHoursOnly(session.createdAt)}
                      </span>
                    </p>
                    {session.location?.org && (
                      <p className="text-xs text-muted-foreground">
                        {session.location.org}
                      </p>
                    )}
                  </div>
                </div>
                <RevokeSingleSessionModal
                  sessionToken={session.token}
                  name={user?.name || ""}
                  email={user?.email || ""}
                />
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No sessions found</p>
          )}
        </div>
      </div>
    </div>
  );
}
