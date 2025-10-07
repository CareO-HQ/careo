"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, User, MapPin, ArrowLeft, Filter } from "lucide-react";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppointmentPage() {
  const router = useRouter();
  const { activeTeamId, activeTeam } = useActiveTeam();
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");

  // Fetch appointments for the active team from Convex
  const appointmentsData = useQuery(
    api.appointments.getAppointmentsByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    if (!appointmentsData) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (filter === "today") {
      return appointmentsData.filter((apt) => {
        const aptDate = new Date(apt.startTime);
        return aptDate.toDateString() === today.toDateString();
      });
    }

    if (filter === "week") {
      return appointmentsData.filter((apt) => {
        const aptDate = new Date(apt.startTime);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= today && aptDate <= nextWeek;
      });
    }

    return appointmentsData;
  }, [appointmentsData, filter]);

  const upcomingCount = appointmentsData?.length || 0;

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
              {activeTeam?.name ? `Upcoming appointments for ${activeTeam.name}` : "Select a team to view appointments"}
            </p>
          </div>
        </div>
        {upcomingCount > 0 && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
            {upcomingCount} Upcoming
          </Badge>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <Select value={filter} onValueChange={(value: "all" | "today" | "week") => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Appointments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      <div className="space-y-0">
        {!appointmentsData ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No appointments</p>
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
                className="flex items-start gap-3 py-4 hover:bg-muted/30 transition-colors"
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
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{appointment.title}</span>
                        {appointment.description && ` - ${appointment.description}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {residentName}
                          {appointment.resident?.roomNumber && ` • Room ${appointment.resident.roomNumber}`}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(appointment.startTime), "PPP 'at' p")}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {appointment.location}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs h-5 text-green-600 bg-green-50 border-green-200 shrink-0"
                    >
                      Scheduled
                    </Badge>
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
