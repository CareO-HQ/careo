"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Filter, Bell, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatTimestampToUKDateTime } from "@/lib/date-utils";

type NotificationType = "info" | "warning" | "success" | "urgent";

export default function IncidentsPage() {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = profile?.role;
  const activeOrganizationId = profile?.active_organization_id;
  const activeTeamId = profile?.active_team_id;

  const fetchIncidents = useCallback(async () => {
    if (!activeOrganizationId || !profile) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from("incidents")
        .select(`
          *,
          resident:residents(id, first_name, last_name, image_url)
        `)
        .eq("organization_id", activeOrganizationId)
        .order("date", { ascending: false })
        .order("time", { ascending: false });

      // If not manager/owner, filter by team
      if (userRole !== "manager" && userRole !== "owner" && userRole !== "saas_admin" && activeTeamId) {
        query = query.eq("team_id", activeTeamId);
      }

      const { data: incidentsData, error } = await query.limit(50);

      if (error) throw error;

      // Fetch read status for these incidents from notification_read_status
      // We need to find notifications associated with these incidents
      const incidentIds = (incidentsData || []).map(i => i.id);
      const readStatusMap: Record<string, boolean> = {};

      if (incidentIds.length > 0) {
        // Find notifications for these incident IDs
        const { data: notifications } = await supabase
          .from("notifications")
          .select("id, metadata->incidentId")
          .eq("organization_id", activeOrganizationId)
          .eq("type", "incident");

        const relevantNotifIds = (notifications || [])
          .map(n => ({ id: n.id, incidentId: String(n.incidentId || "") }))
          .filter(n => incidentIds.includes(n.incidentId))
          .map(n => n.id);

        if (relevantNotifIds.length > 0) {
          const { data: readStatuses } = await supabase
            .from("notification_read_status")
            .select("notification_id")
            .eq("user_id", profile.id)
            .in("notification_id", relevantNotifIds);

          if (readStatuses) {
            // Map incidentId to read status
            const readNotifIds = new Set(readStatuses.map(rs => rs.notification_id));
            (notifications || []).forEach(n => {
              const incidentId = String(n.incidentId || "");
              if (readNotifIds.has(n.id) && incidentId) {
                readStatusMap[incidentId] = true;
              }
            });
          }
        }
      }

      const incidentsWithReadStatus = (incidentsData || []).map(i => ({
        ...i,
        is_read: !!readStatusMap[i.id]
      }));

      setIncidents(incidentsWithReadStatus);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganizationId, activeTeamId, userRole, profile]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Mark all incident notifications as read on mount
  useEffect(() => {
    if (activeOrganizationId && profile?.id) {
      import("@/lib/notifications").then(({ markIncidentNotificationsAsRead }) => {
        markIncidentNotificationsAsRead(profile.id, activeOrganizationId)
          .then(() => {
            // After marking as read, we might want to refresh the local state
            // but fetchIncidents should already be covering the initial load.
          })
          .catch(err => console.error("Failed to mark notifications as read:", err));
      });
    }
  }, [activeOrganizationId, profile?.id]);

  const markAsRead = async (incidentId: string) => {
    if (!profile?.id || !activeOrganizationId) return;

    try {
      // Find the notification for this incident
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", activeOrganizationId)
        .eq("type", "incident")
        .filter("metadata->>incidentId", "eq", incidentId)
        .maybeSingle();

      if (notifications) {
        const { markNotificationAsRead } = await import("@/lib/notifications");
        await markNotificationAsRead(notifications.id, profile.id);

        setIncidents(prev => prev.map(i =>
          i.id === incidentId ? { ...i, is_read: true } : i
        ));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id || !activeOrganizationId) return;

    try {
      const { markIncidentNotificationsAsRead } = await import("@/lib/notifications");
      await markIncidentNotificationsAsRead(profile.id, activeOrganizationId);

      setIncidents(prev => prev.map(i => ({ ...i, is_read: true })));
      toast.success("All incidents marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const getIncidentSeverity = (incidentLevel: string): NotificationType => {
    switch (incidentLevel) {
      case "death":
      case "permanent_harm":
        return "urgent";
      case "minor_injury":
        return "warning";
      case "no_harm":
        return "info";
      case "near_miss":
        return "success";
      default:
        return "info";
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case "urgent":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const formatIncidentLevel = (level: string) => {
    return level
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatIncidentTypes = (types: string[]) => {
    if (!types || types.length === 0) return "Incident";
    return types
      .map((type) => {
        if (type === "FallWitnessed") return "Fall (Witnessed)";
        if (type === "FallUnwitnessed") return "Fall (Unwitnessed)";
        return type;
      })
      .join(", ");
  };

  const handleIncidentClick = async (incident: any) => {
    if (incident.resident_id) {
      router.push(`/dashboard/residents/${incident.resident_id}/incidents`);
    }
  };

  // Filter incidents locally for now if needed
  const filteredIncidents = incidents.filter((incident) => {
    if (filter === "unread") return !incident.is_read; // Assuming is_read column exists or is handled
    return true;
  });

  const unreadCount = incidents.filter((incident) => !incident.is_read).length;

  if (isProfileLoading || isLoading) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrganizationId) {
    return (
      <div className="w-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Please ensure you are assigned to an organization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm text-muted-foreground">
              Incident reports for your organization
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
            {unreadCount} Unread
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <Select value={filter} onValueChange={(value: "all" | "unread") => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Incidents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Incidents</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-sm"
          >
            <Check className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <div className="space-y-0">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread incidents" : "No incidents"}
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const severity = getIncidentSeverity(incident.incident_level);
            const residentName = incident.resident
              ? `${incident.resident.first_name} ${incident.resident.last_name}`
              : `${incident.injured_person_first_name} ${incident.injured_person_surname}`;
            const initials = incident.resident
              ? `${incident.resident.first_name[0]}${incident.resident.last_name[0]}`
              : incident.injured_person_first_name && incident.injured_person_surname
                ? `${incident.injured_person_first_name[0]}${incident.injured_person_surname[0]}`
                : "U";

            return (
              <div
                key={incident.id}
                className={`flex items-start gap-3 py-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${!incident.is_read ? "bg-muted/50" : "bg-muted/5"
                  }`}
                onClick={() => handleIncidentClick(incident)}
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={incident.resident?.image_url ?? undefined} alt={residentName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm ${incident.is_read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        <span className="font-semibold">Incident Report</span> - {residentName} • {formatIncidentTypes(incident.incident_types)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Created: {formatTimestampToUKDateTime(incident.date + "T" + incident.time, "dd MMM yyyy")} at {formatTimestampToUKDateTime(incident.date + "T" + incident.time, "HH:mm")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs h-5 ${getTypeColor(severity)}`}
                        >
                          {formatIncidentLevel(incident.incident_level)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

