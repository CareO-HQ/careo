"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Phone, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ErrorState } from "@/components/ErrorState";
import { format } from "date-fns";

export default function AppointmentPage() {
  const { activeTeamId, activeTeam, isLoading: teamLoading } = useActiveTeam();

  // Fetch appointments for the active team from Convex
  const appointmentsData = useQuery(
    api.appointments.getAppointmentsByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Transform appointments data for display
  const upcomingAppointments = useMemo(() => {
    if (!appointmentsData) return [];

    // Data is already filtered and sorted by the backend query
    // Just return it directly
    return appointmentsData;
  }, [appointmentsData]);

  // Calculate stats from real appointment data
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      total: upcomingAppointments.length,
      thisWeek: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.startTime);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today && aptDate <= nextWeek;
      }).length,
      thisMonth: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.startTime);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today && aptDate <= nextMonth;
      }).length,
      today: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.startTime);
        return aptDate.toDateString() === today.toDateString();
      }).length,
    };
  }, [upcomingAppointments]);

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aptDate = new Date(dateString);
    aptDate.setHours(0, 0, 0, 0);
    const diffTime = aptDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return null;
  };

  // Loading state
  if (teamLoading || appointmentsData === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground ml-3">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // Error state - no team selected
  if (!activeTeamId) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <ErrorState
          message="No team selected"
          description="Please select a team to view appointments."
          showBackButton={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upcoming Appointments</h1>
          <p className="text-muted-foreground mt-1">
            {activeTeam?.name ? `${activeTeam.name} - ` : ""}Scheduled appointments for residents
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments List */}
      <div className="grid grid-cols-1 gap-4">
        {upcomingAppointments.map((appointment) => {
          const daysUntil = getDaysUntil(appointment.startTime);
          const residentName = appointment.resident
            ? `${appointment.resident.firstName} ${appointment.resident.lastName}`
            : "Unknown Resident";
          const roomNumber = appointment.resident?.roomNumber || "N/A";

          return (
            <Card
              key={appointment._id}
              className="hover:shadow-md transition-shadow border-l-4"
              style={{
                borderLeftColor:
                  daysUntil === "Today"
                    ? "#f97316"
                    : daysUntil === "Tomorrow"
                    ? "#3b82f6"
                    : "#8b5cf6",
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{residentName}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        Room {roomNumber}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {appointment.title}
                      </Badge>
                      {daysUntil && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        >
                          <CalendarDays className="w-3 h-3 mr-1" />
                          {daysUntil}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {format(new Date(appointment.startTime), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">Appointment Date</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {format(new Date(appointment.startTime), "h:mm a")}
                        {appointment.endTime && ` - ${format(new Date(appointment.endTime), "h:mm a")}`}
                      </div>
                      <div className="text-xs text-muted-foreground">Appointment Time</div>
                    </div>
                  </div>

                  {appointment.staffId && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                        <div className="text-sm font-medium">{appointment.staffId}</div>
                        <div className="text-xs text-muted-foreground">Assigned Staff</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{appointment.location || "Not specified"}</div>
                      <div className="text-xs text-muted-foreground">Location</div>
                    </div>
                  </div>
                </div>

                {appointment.description && (
                  <div className="pt-3 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">
                      Additional Notes
                    </div>
                    <p className="text-sm leading-relaxed">{appointment.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {upcomingAppointments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Upcoming Appointments</h3>
              <p className="text-muted-foreground">
                There are no scheduled appointments for residents in this team.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
