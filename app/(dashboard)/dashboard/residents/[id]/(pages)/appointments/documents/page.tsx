"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  ClipboardCheck,
  Eye,
  Calendar,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

type DocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function AppointmentDocumentsPage({ params }: DocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = React.useState<{
    appointment: any;
  } | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get all completed appointments for this resident
  const completedAppointments = useQuery(api.appointments.getAppointmentsByResident, {
    residentId: id as Id<"residents">,
    status: "completed"
  });

  // Filter appointments based on calendar selection
  const filteredAppointments = React.useMemo(() => {
    if (!completedAppointments) return [];
    
    let filtered = completedAppointments;
    
    // Filter by calendar selection
    if (selectedDate) {
      // Use local timezone to avoid date shifting issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const selectedDateString = `${year}-${month}-${day}`;
      
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.startTime);
        const appointmentDateString = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;
        return appointmentDateString === selectedDateString;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [completedAppointments, selectedDate]);

  // Group appointments by date for better display
  const groupedAppointments = React.useMemo(() => {
    if (!filteredAppointments) return {};
    
    return filteredAppointments.reduce((groups, appointment) => {
      const date = new Date(appointment.startTime);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      groups[dateString].push(appointment);
      return groups;
    }, {} as Record<string, any[]>);
  }, [filteredAppointments]);

  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment({ appointment });
  };

  const formatAppointmentDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Appointment Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              All completed appointments for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex items-center space-x-2 sm:space-x-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-[240px] justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(undefined)}
              className="sm:ml-2"
            >
              Clear
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {filteredAppointments?.length || 0} completed appointments found
        </p>
      </div>

      {/* Appointments List */}
      {completedAppointments === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      ) : Object.keys(groupedAppointments).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {selectedDate ? "No completed appointments found for this date" : "No completed appointments found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedDate ? "Try selecting a different date" : "Completed appointments will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAppointments).map(([dateString, appointments]) => (
            <div key={dateString} className="space-y-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center space-x-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">
                  {new Date(dateString).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
              </h2>

              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <Card key={appointment._id} className="cursor-pointer shadow-none w-full">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-4">
                        {/* Icon and Text */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-md">
                            <ClipboardCheck className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base">{appointment.title}</h3>
                            {appointment.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground">{appointment.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(appointment.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(appointment.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {appointment.location && (
                                <div className="flex items-center space-x-1">
                                  <span>📍</span>
                                  <span>{appointment.location}</span>
                                </div>
                              )}
                            </div>
                            {appointment.staffId && (
                              <p className="text-xs text-blue-600 mt-1">Staff: {appointment.staffId}</p>
                            )}
                            <p className="text-xs sm:text-sm mt-1 text-green-600">✓ Completed</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewAppointment(appointment)} className="flex items-center text-xs sm:text-sm px-2 py-1">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                  <ClipboardCheck className="w-5 h-5 text-green-600" />
                                  <span className="text-sm sm:text-base">{selectedAppointment?.appointment?.title}</span>
                                </DialogTitle>
                                <DialogDescription>
                                  Appointment details - {selectedAppointment?.appointment && formatAppointmentDateTime(selectedAppointment.appointment.startTime)}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedAppointment?.appointment && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div>
                                      <h4 className="font-medium text-green-800">Status</h4>
                                      <p className="text-sm text-green-700">✓ Completed</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-green-800">Location</h4>
                                      <p className="text-sm text-green-700">{selectedAppointment.appointment.location}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-green-800">Duration</h4>
                                      <p className="text-sm text-green-700">
                                        {new Date(selectedAppointment.appointment.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedAppointment.appointment.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-green-800">Staff</h4>
                                      <p className="text-sm text-green-700">{selectedAppointment.appointment.staffId || "No staff assigned"}</p>
                                    </div>
                                  </div>

                                  {selectedAppointment.appointment.description && (
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Description</h4>
                                      <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                                        {selectedAppointment.appointment.description}
                                      </p>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <h4 className="font-medium">Appointment Information</h4>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p><strong>Created:</strong> {new Date(selectedAppointment.appointment.createdAt).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</p>
                                      {selectedAppointment.appointment.updatedAt && (
                                        <p><strong>Last updated:</strong> {new Date(selectedAppointment.appointment.updatedAt).toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}