"use client";

import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Globe } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const { data: session } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: sessionsList } = await authClient.listSessions();
        const { data: currentSessionData } = await authClient.getSession();
        
        setSessions(sessionsList || []);
        setCurrentSession(currentSessionData?.session || null);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setLoading(false);
      }
    };

    if (session) {
      fetchSessions();
    }
  }, [session]);

  const getDeviceIcon = (userAgent?: string | null) => {
    if (!userAgent) return Globe;
    
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return Smartphone;
    }
    if (userAgent.includes('Electron') || userAgent.includes('Desktop')) {
      return Monitor;
    }
    return Globe;
  };

  const getDeviceName = (userAgent?: string | null) => {
    if (!userAgent) return "Unknown Device";
    
    if (userAgent.includes('Electron')) return "Desktop App";
    if (userAgent.includes('Chrome')) return "Chrome Browser";
    if (userAgent.includes('Firefox')) return "Firefox Browser";
    if (userAgent.includes('Safari')) return "Safari Browser";
    if (userAgent.includes('iPhone')) return "iPhone";
    if (userAgent.includes('Android')) return "Android Device";
    
    return "Web Browser";
  };

  const formatLastSeen = (date: Date | string | null | undefined) => {
    if (!mounted) return "Loading..."; // Prevent hydration mismatch
    
    try {
      if (!date) return "Unknown";
      
      const now = new Date();
      let dateObj: Date;
      
      if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return "Unknown";
      }
      
      if (!dateObj || isNaN(dateObj.getTime())) {
        return "Unknown";
      }
      
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return "Just now";
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hours ago`;
      } else {
        return `${diffDays} days ago`;
      }
    } catch (error) {
      console.error('Error in formatLastSeen:', error, date);
      return "Unknown";
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      await authClient.revokeOtherSessions();
      // Refresh sessions list
      const { data: sessionsList } = await authClient.listSessions();
      setSessions(sessionsList || []);
    } catch (error) {
      console.error("Failed to revoke other sessions:", error);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Security & access</h2>
        </div>
        <div>
          <h3 className="font-medium mb-2">Sessions</h3>
          <p className="text-sm text-muted-foreground mb-4">Devices logged into your account</p>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Security & access</h2>
        </div>
        <div>
          <h3 className="font-medium mb-2">Sessions</h3>
          <p className="text-sm text-muted-foreground mb-4">Devices logged into your account</p>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Security & access</h2>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Sessions</h3>
        <p className="text-sm text-muted-foreground mb-4">Devices logged into your account</p>
        
        {/* Current Session */}
        {currentSession && (
          <div className="border rounded-lg p-4 mb-4 bg-card">
            <div className="flex items-center gap-3">
              {(() => {
                const IconComponent = getDeviceIcon(currentSession?.userAgent);
                return <IconComponent className="h-5 w-5 text-muted-foreground" />;
              })()}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getDeviceName(currentSession?.userAgent)}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Current session
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentSession.ipAddress || "Unknown location"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other Sessions */}
        {sessions.length > 1 && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">{sessions.length - 1} other sessions</span>
              <Button variant="outline" size="sm" onClick={handleRevokeOtherSessions}>
                Revoke all
              </Button>
            </div>
            
            <div className="space-y-4">
              {sessions
                .filter(s => s.id !== currentSession?.id)
                .map((session) => {
                  const IconComponent = getDeviceIcon(session.userAgent);
                  return (
                    <div key={session.id} className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{getDeviceName(session.userAgent)}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.ipAddress || "Unknown location"} • Last seen {formatLastSeen(session.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {sessions.length <= 1 && (
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">No other active sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}