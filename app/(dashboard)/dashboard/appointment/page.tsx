"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Phone, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { useActiveTeam } from "@/hooks/use-active-team";

type AppointmentType = "GP Visit" | "Hospital" | "Dentist" | "Optician" | "Specialist" | "Other";

interface Appointment {
  id: string;
  teamId: string;
  residentName: string;
  residentRoom: string;
  appointmentType: AppointmentType;
  date: string;
  time: string;
  location: string;
  provider: string;
  notes: string;
  contactNumber?: string;
  accompaniedBy?: string;
}

// Dummy data with team assignments
const allAppointments: Appointment[] = [
  // Team 1 appointments
  {
    id: "1",
    teamId: "team1",
    residentName: "Margaret Wilson",
    residentRoom: "Room 12",
    appointmentType: "GP Visit",
    date: "2025-10-08",
    time: "10:30",
    location: "Dr. Smith's Clinic, 45 High Street",
    provider: "Dr. James Smith",
    notes: "Regular check-up and blood pressure monitoring",
    contactNumber: "020 7946 0958",
    accompaniedBy: "Sarah Johnson (Care Assistant)",
  },
  {
    id: "2",
    teamId: "team1",
    residentName: "John Peterson",
    residentRoom: "Room 8",
    appointmentType: "Hospital",
    date: "2025-10-09",
    time: "14:00",
    location: "St. Mary's Hospital - Cardiology Department",
    provider: "Dr. Emily Chen",
    notes: "Follow-up appointment for heart condition",
    contactNumber: "020 7946 1234",
    accompaniedBy: "Michael Brown (Senior Carer)",
  },
  {
    id: "4",
    teamId: "team1",
    residentName: "Arthur Brown",
    residentRoom: "Room 22",
    appointmentType: "Optician",
    date: "2025-10-15",
    time: "09:00",
    location: "Vision Care Centre, 12 Oak Avenue",
    provider: "Sarah Williams - Optometrist",
    notes: "Eye test and new prescription glasses",
    contactNumber: "020 7946 9012",
  },
  {
    id: "5",
    teamId: "team1",
    residentName: "Elizabeth Davis",
    residentRoom: "Room 5",
    appointmentType: "Specialist",
    date: "2025-10-20",
    time: "15:30",
    location: "Royal Hospital - Rheumatology",
    provider: "Dr. Patricia Moore",
    notes: "Arthritis management consultation",
    contactNumber: "020 7946 3456",
    accompaniedBy: "David Wilson (Manager)",
  },
  // Team 2 appointments
  {
    id: "7",
    teamId: "team2",
    residentName: "Sarah Thompson",
    residentRoom: "Room 24",
    appointmentType: "Dentist",
    date: "2025-10-12",
    time: "11:30",
    location: "City Dental Care, 89 Park Lane",
    provider: "Dr. Michael Scott",
    notes: "Routine dental check and cleaning",
    contactNumber: "020 7946 7890",
    accompaniedBy: "Emma Roberts (Care Assistant)",
  },
  {
    id: "8",
    teamId: "team2",
    residentName: "William Harris",
    residentRoom: "Room 31",
    appointmentType: "Hospital",
    date: "2025-10-14",
    time: "13:00",
    location: "General Hospital - Neurology",
    provider: "Dr. Rebecca Jones",
    notes: "Neurological assessment follow-up",
    contactNumber: "020 7946 5432",
  },
  {
    id: "9",
    teamId: "team2",
    residentName: "Patricia Anderson",
    residentRoom: "Room 27",
    appointmentType: "GP Visit",
    date: "2025-10-16",
    time: "10:00",
    location: "Riverside Medical Centre",
    provider: "Dr. Thomas Green",
    notes: "Diabetes monitoring and medication review",
    contactNumber: "020 7946 2468",
    accompaniedBy: "James Miller (Senior Carer)",
  },
];

export default function AppointmentPage() {
  const { activeTeamId, activeTeam, isLoading } = useActiveTeam();

  const getTypeColor = (type: AppointmentType) => {
    switch (type) {
      case "GP Visit":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Hospital":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Dentist":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "Optician":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "Specialist":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Filter appointments by active team and only show upcoming appointments
  const upcomingAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use actual activeTeamId when available, fallback to "team1" for demo
    const teamToFilter = activeTeamId || "team1";

    return allAppointments
      .filter((apt) => {
        const aptDate = new Date(apt.date);
        // Filter by team and only show upcoming appointments (today or future)
        return apt.teamId === teamToFilter && aptDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activeTeamId]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      total: upcomingAppointments.length,
      thisWeek: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.date);
        return aptDate >= today && aptDate <= nextWeek;
      }).length,
      thisMonth: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.date);
        return aptDate >= today && aptDate <= nextMonth;
      }).length,
      today: upcomingAppointments.filter((a) => {
        const aptDate = new Date(a.date);
        const todayDate = new Date();
        return aptDate.toDateString() === todayDate.toDateString();
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

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
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
          const daysUntil = getDaysUntil(appointment.date);

          return (
            <Card
              key={appointment.id}
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
                      <CardTitle className="text-lg">{appointment.residentName}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {appointment.residentRoom}
                      </Badge>
                      <Badge className={getTypeColor(appointment.appointmentType)}>
                        {appointment.appointmentType}
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
                        {new Date(appointment.date).toLocaleDateString("en-GB", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">Appointment Date</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{appointment.time}</div>
                      <div className="text-xs text-muted-foreground">Appointment Time</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{appointment.provider}</div>
                      <div className="text-xs text-muted-foreground">Healthcare Provider</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{appointment.location}</div>
                      <div className="text-xs text-muted-foreground">Location</div>
                    </div>
                  </div>

                  {appointment.contactNumber && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{appointment.contactNumber}</div>
                        <div className="text-xs text-muted-foreground">Contact Number</div>
                      </div>
                    </div>
                  )}

                  {appointment.accompaniedBy && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{appointment.accompaniedBy}</div>
                        <div className="text-xs text-muted-foreground">Accompanied By</div>
                      </div>
                    </div>
                  )}
                </div>

                {appointment.notes && (
                  <div className="pt-3 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">
                      Additional Notes
                    </div>
                    <p className="text-sm leading-relaxed">{appointment.notes}</p>
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
