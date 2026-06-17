"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowLeft, Filter, Check, Bell, X } from "lucide-react";
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
  const { supabase, user } = useSupabase();
  const userRole = profile?.role;
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [appointmentsData, setAppointmentsData] = useState<any[] | null>(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [tomorrowReminders, setTomorrowReminders] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      created_at: string;
      metadata?: {
        startTime?: string;
      } | null;
    }>
  >([]);

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

  const fetchTomorrowReminders = useCallback(async () => {
    if (!user || !activeOrganizationId) return;

    try {
      // 1. Fetch dismissed notification IDs for the user
      const { data: dismissals, error: dismissalsError } = await supabase
        .from("notification_dismissals")
        .select("notification_id")
        .eq("user_id", user.id);

      if (dismissalsError) {
        console.error("Error fetching notification dismissals:", dismissalsError);
      }

      const dismissedSet = new Set<string>(
        (dismissals || []).map((d) => d.notification_id)
      );

      // 2. Fetch the reminders
      let reminderQuery = supabase
        .from("notifications")
        .select("id, title, message, created_at, metadata")
        .eq("organization_id", activeOrganizationId)
        .eq("type", "appointment_tomorrow_reminder")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      if (profile?.active_care_home_id) {
        reminderQuery = reminderQuery.eq("care_home_id", profile.active_care_home_id);
      }

      if (activeTeamId) {
        reminderQuery = reminderQuery.or(`team_id.is.null,team_id.eq.${activeTeamId}`);
      }

      const { data, error } = await reminderQuery;

      if (error) {
        console.error("Error fetching appointment reminders:", error);
        setTomorrowReminders([]);
        return;
      }

      const reminders = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? "Appointment Reminder",
        message: row.message ?? "",
        created_at: row.created_at,
        metadata:
          typeof row.metadata === "object" && row.metadata !== null
            ? (row.metadata as { startTime?: string })
            : null,
      }));

      // 3. Filter out dismissed and past reminders
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const activeReminders = reminders.filter((r) => {
        // Exclude if dismissed
        if (dismissedSet.has(r.id)) {
          return false;
        }

        // Exclude if appointment start time is in the past (before today)
        if (r.metadata?.startTime) {
          const appointmentTime = new Date(r.metadata.startTime);
          return appointmentTime >= startOfToday;
        }

        // Fallback for notifications without startTime in metadata: exclude if created more than 48 hours ago
        const createdAt = new Date(r.created_at);
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        return createdAt >= fortyEightHoursAgo;
      });

      setTomorrowReminders(activeReminders.slice(0, 20));
    } catch (error) {
      console.error("Error in reminder fetch:", error);
      setTomorrowReminders([]);
    }
  }, [user, activeOrganizationId, activeTeamId, profile?.active_care_home_id, supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchTomorrowReminders();
  }, [fetchTomorrowReminders]);

  // Set up real-time subscription for appointments
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
          fetchTomorrowReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId, activeOrganizationId, shouldUseOrganization, isTeamLoading, supabase, fetchAppointments, fetchTomorrowReminders]);

  // Listen for custom 'appointments-updated' event
  useEffect(() => {
    const handleUpdate = () => {
      fetchAppointments();
      fetchTomorrowReminders();
    };

    window.addEventListener("appointments-updated", handleUpdate);
    return () => {
      window.removeEventListener("appointments-updated", handleUpdate);
    };
  }, [fetchAppointments, fetchTomorrowReminders]);

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

  const handleDismissReminder = async (reminderId: string) => {
    if (!user) return;
    try {
      // Optimistically remove from state
      setTomorrowReminders((prev) => prev.filter((r) => r.id !== reminderId));

      const { error } = await supabase.from("notification_dismissals").insert({
        notification_id: reminderId,
        user_id: user.id,
        dismissed_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error dismissing reminder:", error);
        toast.error("Failed to dismiss reminder");
        fetchTomorrowReminders();
      } else {
        toast.success("Reminder dismissed");
      }
    } catch (error) {
      console.error("Error in handleDismissReminder:", error);
      toast.error("Failed to dismiss reminder");
      fetchTomorrowReminders();
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
        {tomorrowReminders.length > 0 && (
          <div className="mb-4 rounded-md border bg-amber-50/60 border-amber-200">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
              <Bell className="w-4 h-4 text-amber-700" />
              <p className="text-sm font-medium text-amber-900">Tomorrow Reminders</p>
            </div>
            <div>
              {tomorrowReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="relative px-4 py-3 border-b last:border-b-0 border-amber-100 pr-10"
                >
                  <p className="text-sm font-medium text-amber-900">{reminder.title}</p>
                  <p className="text-sm text-amber-800 mt-1">{reminder.message}</p>
                  <p className="text-xs text-amber-700 mt-2">
                    {reminder.metadata?.startTime
                      ? `Appointment time: ${format(new Date(reminder.metadata.startTime), "PPP 'at' p")}`
                      : `Created: ${format(new Date(reminder.created_at), "PPP 'at' p")}`}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissReminder(reminder.id);
                    }}
                    title="Dismiss reminder"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
