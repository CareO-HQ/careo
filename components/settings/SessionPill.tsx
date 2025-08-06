import { formatLocationDisplay } from "@/app/(settings)/settings/members/session/page";
import { formatHoursOnly, LocationInfo } from "@/types";
import RevokeSingleSessionModal from "./members/RevokeSingleSessionModal";

interface SessionPillProps {
  ipAddress: string;
  sessionId: string;
  sessionToken: string;
  currentSessionId?: string;
  location?: LocationInfo;
  createdAt: Date;
  userName: string;
  userEmail: string;
  revokeSessionComponent: React.ReactNode;
}

export default function SessionPill({
  ipAddress,
  sessionId,
  sessionToken,
  currentSessionId,
  location,
  createdAt,
  userName,
  userEmail,
  revokeSessionComponent
}: SessionPillProps) {
  return (
    <div className="flex flex-row justify-between items-center w-full gap-4">
      <div className="flex flex-row justify-start items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 bg-muted rounded-lg"></div>
        <div className="flex flex-col justify-start items-start">
          <div className="flex flex-row justify-start items-center gap-2">
            <p className="text-sm font-medium">{ipAddress}</p>
            {currentSessionId && (
              <p className="text-xs text-muted-foreground">Current session</p>
            )}
          </div>
          {location && (
            <p className="text-xs text-muted-foreground">
              {formatLocationDisplay(location ?? null)}
              <span className="ml-2">Created {formatHoursOnly(createdAt)}</span>
            </p>
          )}
          {location?.org && (
            <p className="text-xs text-muted-foreground">{location.org}</p>
          )}
        </div>
      </div>
      {revokeSessionComponent}
    </div>
  );
}
