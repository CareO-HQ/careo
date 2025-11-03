"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
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
import { Id } from "@/convex/_generated/dataModel";

type NotificationType = "info" | "warning" | "success" | "urgent";

export default function NotificationPage() {
  const router = useRouter();
  const { activeTeam, activeTeamId, activeOrganization, activeOrganizationId, isLoading: isTeamLoading } = useActiveTeam();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Debug logging
  console.log('Notification Page Debug:', {
    activeTeamId,
    activeOrganizationId,
    activeTeam,
    activeOrganization,
    isTeamLoading
  });

  // Fetch incidents - either for specific team or entire organization
  const incidents = useQuery(
    activeTeamId
      ? api.incidents.getIncidentsByTeam
      : activeOrganizationId
      ? api.incidents.getIncidentsByOrganization
      : "skip",
    activeTeamId
      ? { teamId: activeTeamId, limit: 50 }
      : activeOrganizationId
      ? { organizationId: activeOrganizationId, limit: 50 }
      : "skip"
  );

  // Mutations
  const markIncidentAsRead = useMutation(api.notifications.markIncidentAsRead);
  const markMultipleAsRead = useMutation(api.notifications.markMultipleIncidentsAsRead);

  // Only show loading if we're waiting for team info, not if no team is selected
  const isLoading = isTeamLoading;
  const hasMarkedAsRead = useRef(false);

  // Removed auto-mark as read functionality - incidents only marked as read when clicked

  // Filter incidents based on read status from database
  const filteredIncidents = incidents?.filter((incident) => {
    if (filter === "unread") return !incident.isRead;
    return true;
  }) || [];

  const unreadCount = incidents?.filter((incident) => !incident.isRead).length || 0;

  const markAsRead = async (incidentId: Id<"incidents">) => {
    try {
      await markIncidentAsRead({ incidentId });
    } catch (error) {
      console.error("Error marking incident as read:", error);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    if (!incidents) return;

    const unreadIncidentIds = incidents
      .filter((incident) => !incident.isRead)
      .map((incident) => incident._id);

    if (unreadIncidentIds.length === 0) {
      toast.info("No unread notifications");
      return;
    }

    try {
      await markMultipleAsRead({ incidentIds: unreadIncidentIds });
      toast.success("All notifications marked as read");
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

  const getTypeBadgeText = (type: NotificationType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
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
    // Mark as read when clicking
    if (!incident.isRead) {
      await markAsRead(incident._id);
    }

    if (incident.residentId) {
      router.push(`/dashboard/residents/${incident.residentId}/incidents`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No active team or organization selected state
  if (!activeTeamId && !activeOrganizationId) {
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
          <p className="text-muted-foreground">Please select a care home to see notifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm text-muted-foreground">
              Incident reports for {activeTeamId ? activeTeam?.name || 'selected unit' : `All units in ${activeOrganization?.name || 'care home'}`}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
            {unreadCount} Unread
          </Badge>
        )}
      </div>

      {/* Filter and Actions */}
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

      {/* TODO: Add role-based filtering here in the future */}
      {/* For now, showing all incidents for the selected team/unit */}

      {/* Incidents List */}
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
            const severity = getIncidentSeverity(incident.incidentLevel);
            const residentName = incident.resident
              ? `${incident.resident.firstName} ${incident.resident.lastName}`
              : `${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}`;
            const initials = incident.resident
              ? `${incident.resident.firstName[0]}${incident.resident.lastName[0]}`
              : incident.injuredPersonFirstName && incident.injuredPersonSurname
              ? `${incident.injuredPersonFirstName[0]}${incident.injuredPersonSurname[0]}`
              : "U";

            return (
              <div
                key={incident._id}
                className={`flex items-start gap-3 py-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                  !incident.isRead ? "bg-muted/50" : "bg-muted/5"
                }`}
                onClick={() => handleIncidentClick(incident)}
              >
                {/* Resident Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={incident.resident?.imageUrl} alt={residentName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm ${incident.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        <span className="font-semibold">Incident Report</span> - {residentName} • {formatIncidentTypes(incident.incidentTypes)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Created: {format(new Date(incident.date + " " + incident.time), "PPp")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs h-5 ${getTypeColor(severity)}`}
                        >
                          {formatIncidentLevel(incident.incidentLevel)}
                        </Badge>
                      </div>
                    </div>
                    {!incident.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(incident._id);
                        }}
                        className="h-7 px-2 text-xs shrink-0"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
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
