"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowLeft, Filter, Check } from "lucide-react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useProfile } from "@/hooks/use-profile";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getAppointments, markAppointmentAsRead, markMultipleAppointmentsAsRead } from "@/lib/appointments";

export default function AppointmentPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization, isLoading: isTeamLoading } = useActiveTeam();
  const { profile } = useProfile();
  const userRole = profile?.role;
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [appointmentsData, setAppointmentsData] = useState<any[] | null>(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  // For managers and owners, always use organization-based queries with care home filter; for other roles, use team if available
  const shouldUseOrganization = userRole === "manager" || userRole === "owner";

  // Fetch appointments from Supabase
  const fetchAppointments = useCallback(async () => {
    if (isTeamLoading) return;

    if (!activeOrganizationId && !activeTeamId) {
      setAppointmentsData([]);
      setAppointmentsLoading(false);
      return;
    }

    try {
      setAppointmentsLoading(true);
      const filters: {
        organizationId?: string;
        careHomeId?: string;
        teamId?: string;
        includeAll?: boolean;
      } = {
        includeAll: true,
      };

      if (shouldUseOrganization || !activeTeamId) {
        filters.organizationId = activeOrganizationId ?? undefined;
        // For owners/managers, filter by care home if selected
        if (profile?.active_care_home_id) {
          filters.careHomeId = profile.active_care_home_id;
        }
      } else {
        filters.teamId = activeTeamId ?? undefined;
      }

      const result = await getAppointments(filters);
      setAppointmentsData(result.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
      setAppointmentsData([]);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [activeTeamId, activeOrganizationId, shouldUseOrganization, isTeamLoading]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Set up real-time subscription for appointments
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (isTeamLoading || (!activeTeamId && !activeOrganizationId)) return;

    let filterField: string;
    let filterValue: string;

    if (shouldUseOrganization || !activeTeamId) {
      filterField = profile?.active_care_home_id ? "care_home_id" : "organization_id";
      filterValue = profile?.active_care_home_id || activeOrganizationId!;
    } else {
      filterField = "team_id";
      filterValue = activeTeamId!;
    }

    if (!filterValue) return;

    const channel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `${filterField}=eq.${filterValue}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId, activeOrganizationId, shouldUseOrganization, isTeamLoading, supabase, fetchAppointments]);

  // Listen for custom 'appointments-updated' event
  useEffect(() => {
    const handleUpdate = () => {
      fetchAppointments();
    };

    window.addEventListener("appointments-updated", handleUpdate);
    return () => {
      window.removeEventListener("appointments-updated", handleUpdate);
    };
  }, [fetchAppointments]);

  // Auto-clear sidebar red badge when Appointments page is visited
  useEffect(() => {
    if (!user || !activeOrganizationId) return;

    async function clearAppointmentBadge() {
      try {
        // Find all appointment notifications for this user/org/carehome
        let query = supabase
          .from("notifications")
          .select("id")
          .eq("organization_id", activeOrganizationId)
          .like("type", "appointment_%")
          .or(`user_id.eq.${user!.id},user_id.is.null`);

        if (profile?.active_care_home_id) {
          query = query.eq("care_home_id", profile.active_care_home_id);
        }

        const { data: notifs } = await query;

        if (!notifs || notifs.length === 0) return;

        const notifIds = notifs.map((n: any) => n.id);

        // Check which are already read
        const { data: alreadyRead } = await supabase
          .from("notification_read_status")
          .select("notification_id")
          .eq("user_id", user!.id)
          .in("notification_id", notifIds);

        const alreadyReadIds = new Set((alreadyRead || []).map((r: any) => r.notification_id));
        const unreadIds = notifIds.filter((id: string) => !alreadyReadIds.has(id));

        if (unreadIds.length > 0) {
          const readEntries = unreadIds.map((id: string) => ({
            notification_id: id,
            user_id: user!.id,
          }));
          await supabase.from("notification_read_status").insert(readEntries);

          // Tell the sidebar to refresh its counts immediately
          window.dispatchEvent(new CustomEvent("sidebar-counts-refresh"));
        }
      } catch (err) {
        console.error("Error clearing appointment badge:", err);
      }
    }

    clearAppointmentBadge();
  }, [user, activeOrganizationId, supabase]);

  const isLoading = isTeamLoading || appointmentsLoading;

  // Filter appointments by read/unread status
  const filteredAppointments = useMemo(() => {
    if (appointmentsData === null) return null; // Still loading
    if (!appointmentsData.length) return []; // No appointments

    if (filter === "unread") {
      return appointmentsData.filter((apt) => !apt.isRead);
    }

    return appointmentsData;
  }, [appointmentsData, filter]);

  const unreadCount = useMemo(() => {
    if (!appointmentsData || appointmentsData === null) return 0;
    return appointmentsData.filter((apt) => !apt.isRead).length;
  }, [appointmentsData]);

  const handleAppointmentClick = async (appointment: any) => {
    // Mark as read
    if (!appointment.isRead) {
      try {
        await markAppointmentAsRead(appointment.id || appointment._id);
        // Update local state
        setAppointmentsData((prev) =>
          prev?.map((apt) =>
            (apt.id === appointment.id || apt._id === appointment._id)
              ? { ...apt, isRead: true }
              : apt
          ) || []
        );
      } catch (error) {
        console.error("Error marking appointment as read:", error);
      }
    }

    // Navigate to resident's appointment details
    router.push(`/dashboard/residents/${appointment.residentId || appointment.resident_id}/appointments`);
  };

  const markAsRead = async (appointmentId: string) => {
    try {
      await markAppointmentAsRead(appointmentId);
      // Update local state
      setAppointmentsData((prev) =>
        prev?.map((apt) =>
          (apt.id === appointmentId || apt._id === appointmentId)
            ? { ...apt, isRead: true }
            : apt
        ) || []
      );
      toast.success("Appointment marked as read");
    } catch (error) {
      console.error("Error marking appointment as read:", error);
      toast.error("Failed to mark appointment as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAppointments = appointmentsData?.filter((apt) => !apt.isRead) || [];
      const appointmentIds = unreadAppointments.map((apt) => apt.id || apt._id);

      if (appointmentIds.length === 0) return;

      await markMultipleAppointmentsAsRead(appointmentIds);
      // Update local state
      setAppointmentsData((prev) =>
        prev?.map((apt) => ({ ...apt, isRead: true })) || []
      );
      toast.success("All appointments marked as read");
    } catch (error) {
      console.error("Error marking all appointments as read:", error);
      toast.error("Failed to mark all appointments as read");
    }
  };

  // Loading state
  if (isLoading) {
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
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
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
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Please select a care home to see appointments</p>
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
          <Calendar className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-semibold">Appointments</h1>
            <p className="text-sm text-muted-foreground">
              Upcoming appointments for {shouldUseOrganization || !activeTeamId ? `All units in ${activeOrganization?.name || 'care home'}` : activeTeam?.name || 'selected unit'}
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
            <SelectValue placeholder="All Appointments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
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

      {/* Appointments List */}
      <div className="space-y-0">
        {filteredAppointments === null ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">Loading appointments...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread appointments" : "No appointments"}
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const residentName = appointment.resident
              ? `${appointment.resident.firstName} ${appointment.resident.lastName}`
              : "Unknown";
            const initials = appointment.resident
              ? `${appointment.resident.firstName[0]}${appointment.resident.lastName[0]}`
              : "U";
            const appointmentId = appointment.id || appointment._id;
            const startTime = appointment.startTime || appointment.start_time;

            return (
              <div
                key={appointmentId}
                className={`flex items-start gap-3 py-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${!appointment.isRead ? "bg-muted/50" : "bg-muted/5"
                  }`}
                onClick={() => handleAppointmentClick(appointment)}
              >
                {/* Resident Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={appointment.resident?.imageUrl ?? undefined} alt={residentName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm ${appointment.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        <span className="font-semibold">{appointment.title}</span> - {residentName}
                        {appointment.description && ` • ${appointment.description}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(startTime), "PPP 'at' p")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs h-5"
                        >
                          {appointment.location}
                        </Badge>
                      </div>
                    </div>
                    {!appointment.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(appointmentId);
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
