"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, ArrowLeft, Filter, Check } from "lucide-react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function AppointmentPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam, activeOrganizationId, activeOrganization, isLoading: isTeamLoading } = useActiveTeam();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Fetch appointments - either for specific team or entire organization
  const appointmentsData = useQuery(
    activeTeamId
      ? api.appointments.getAppointmentsByTeam
      : activeOrganizationId
      ? api.appointments.getAppointmentsByOrganization
      : "skip",
    activeTeamId
      ? { teamId: activeTeamId }
      : activeOrganizationId
      ? { organizationId: activeOrganizationId }
      : "skip"
  );

  const markAppointmentAsRead = useMutation(api.appointmentNotifications.markAppointmentAsRead);
  const markMultipleAsRead = useMutation(api.appointmentNotifications.markMultipleAppointmentsAsRead);

  const isLoading = isTeamLoading;
  const hasMarkedAsRead = useRef(false);

  // Removed auto-mark as read functionality - appointments only marked as read when clicked

  // Filter appointments by read/unread status
  const filteredAppointments = useMemo(() => {
    if (!appointmentsData) return [];

    if (filter === "unread") {
      return appointmentsData.filter((apt) => !apt.isRead);
    }

    return appointmentsData;
  }, [appointmentsData, filter]);

  const unreadCount = useMemo(() => {
    if (!appointmentsData) return 0;
    return appointmentsData.filter((apt) => !apt.isRead).length;
  }, [appointmentsData]);

  const handleAppointmentClick = async (appointment: any) => {
    // Mark as read
    if (!appointment.isRead) {
      try {
        await markAppointmentAsRead({ appointmentId: appointment._id });
      } catch (error) {
        console.error("Error marking appointment as read:", error);
      }
    }

    // Navigate to resident's appointment details (you can customize this)
    router.push(`/dashboard/residents/${appointment.residentId}/appointments`);
  };

  const markAsRead = async (appointmentId: Id<"appointments">) => {
    try {
      await markAppointmentAsRead({ appointmentId });
      toast.success("Appointment marked as read");
    } catch (error) {
      console.error("Error marking appointment as read:", error);
      toast.error("Failed to mark appointment as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAppointments = appointmentsData?.filter((apt) => !apt.isRead) || [];
      const appointmentIds = unreadAppointments.map((apt) => apt._id);

      if (appointmentIds.length === 0) return;

      await markMultipleAsRead({ appointmentIds });
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
              Upcoming appointments for {activeTeamId ? activeTeam?.name || 'selected unit' : `All units in ${activeOrganization?.name || 'care home'}`}
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
        {filteredAppointments.length === 0 ? (
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

            return (
              <div
                key={appointment._id}
                className={`flex items-start gap-3 py-4 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                  !appointment.isRead ? "bg-muted/50" : "bg-muted/5"
                }`}
                onClick={() => handleAppointmentClick(appointment)}
              >
                {/* Resident Avatar */}
                <Avatar className="w-10 h-10">
                  <AvatarImage src={appointment.resident?.imageUrl} alt={residentName} />
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
                          {format(new Date(appointment.startTime), "PPP 'at' p")}
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
                          markAsRead(appointment._id);
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
