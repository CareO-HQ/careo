"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Calendar,
  User,
  FileText,
  Filter,
  Download,
  Eye,
  CalendarCheck,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type AppointmentsDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function AppointmentsDocumentsPage({ params }: AppointmentsDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Get all appointments for this resident (archived appointments)
  const allAppointments = useQuery(api.appointments.getAppointmentsByResident, {
    residentId: id as Id<"residents">,
  });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from appointments for filter
  const availableYears = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];
    const years = [...new Set(allAppointments.map(appointment =>
      new Date(appointment.startTime).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [allAppointments]);

  // Filter and sort appointments
  const filteredAppointments = useMemo(() => {
    if (!allAppointments) return [];

    // Only show appointments up to today (exclude future appointments)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    let filtered = [...allAppointments].filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate <= today; // Only include today and past appointments
    });

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(appointment =>
        appointment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.staffId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(appointment => {
        const appointmentMonth = new Date(appointment.startTime).getMonth() + 1;
        return appointmentMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(appointment => {
        const appointmentYear = new Date(appointment.startTime).getFullYear();
        return appointmentYear === parseInt(selectedYear);
      });
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allAppointments, searchQuery, selectedMonth, selectedYear, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Handlers
  const handleViewAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredAppointments || filteredAppointments.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Title", "Description", "Location", "Staff", "Status"];
    const rows = filteredAppointments.map(appointment => [
      format(new Date(appointment.startTime), "yyyy-MM-dd"),
      `${format(new Date(appointment.startTime), "HH:mm")} - ${format(new Date(appointment.endTime), "HH:mm")}`,
      appointment.title,
      appointment.description || "",
      appointment.location || "",
      appointment.staffId || "",
      appointment.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (!resident || !allAppointments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const appointmentStats = {
    total: allAppointments.length,
    thisMonth: allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      const now = new Date();
      return appointmentDate.getMonth() === now.getMonth() && appointmentDate.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: allAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return appointmentDate >= weekAgo;
    }).length,
    uniqueLocations: new Set(allAppointments.filter(a => a.location).map(appointment => appointment.location)).size,
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}/appointments`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Appointments
        </Button>
        <span>/</span>
        <span className="text-foreground">All Appointments</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/appointments`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Appointments History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of appointments for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Total Appointments</p>
                <p className="text-2xl font-bold text-indigo-900">{appointmentStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{appointmentStats.thisMonth}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">This Week</p>
                <p className="text-2xl font-bold text-blue-900">{appointmentStats.thisWeek}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Locations</p>
                <p className="text-2xl font-bold text-purple-900">{appointmentStats.uniqueLocations}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filter Appointments</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredAppointments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by title, description, location, or staff..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedMonth}
              onValueChange={(value) => {
                setSelectedMonth(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedYear}
              onValueChange={(value) => {
                setSelectedYear(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Appointment Records ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No appointments found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No archived appointments recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.map((appointment) => (
                      <TableRow key={appointment._id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{format(new Date(appointment.startTime), "dd MMM yyyy")}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{appointment.title}</p>
                            {appointment.description && (
                              <p className="text-sm text-gray-500 truncate max-w-[200px]">{appointment.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {appointment.location ? (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{appointment.location}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.staffId ? (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{appointment.staffId}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.status === "completed" ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          ) : appointment.status === "cancelled" ? (
                            <Badge className="bg-red-100 text-red-800 border-0">
                              Cancelled
                            </Badge>
                          ) : appointment.status === "rescheduled" ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border-0">
                              Rescheduled
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-0">
                              Scheduled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAppointment(appointment)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Appointment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Complete appointment information for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedAppointment && (
              <div className="space-y-6">
                {/* Appointment Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Appointment Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">
                        {format(new Date(selectedAppointment.startTime), "PPP")}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedAppointment.startTime), "HH:mm")} - {format(new Date(selectedAppointment.endTime), "HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      {selectedAppointment.status === "completed" ? (
                        <Badge className="bg-green-100 text-green-800 border-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : selectedAppointment.status === "cancelled" ? (
                        <Badge className="bg-red-100 text-red-800 border-0">
                          Cancelled
                        </Badge>
                      ) : selectedAppointment.status === "rescheduled" ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border-0">
                          Rescheduled
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      {selectedAppointment.location ? (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{selectedAppointment.location}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400">No location specified</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Staff Member</p>
                      {selectedAppointment.staffId ? (
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <p className="font-medium">{selectedAppointment.staffId}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400">No staff assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Appointment Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Title</p>
                      <p className="font-medium text-lg">{selectedAppointment.title}</p>
                    </div>
                    {selectedAppointment.description && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Description</p>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedAppointment.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Record Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Record Type</p>
                      <p className="font-medium">Archived Appointment</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{format(new Date(selectedAppointment.createdAt), "PPP")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}