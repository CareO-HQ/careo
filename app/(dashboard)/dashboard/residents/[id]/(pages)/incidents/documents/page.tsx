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
  AlertTriangle,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Shield,
  Heart,
  Pill,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type IncidentsDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsDocumentsPage({ params }: IncidentsDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch all incidents
  const allIncidents = useQuery(api.incidents.getByResident, {
    residentId: id as Id<"residents">
  });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from incidents for filter
  const availableYears = useMemo(() => {
    if (!allIncidents || allIncidents.length === 0) return [];
    const years = [...new Set(allIncidents.map(incident =>
      new Date(incident.date).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [allIncidents]);

  // Get unique incident types for filter
  const availableTypes = useMemo(() => {
    if (!allIncidents || allIncidents.length === 0) return [];
    const types = new Set<string>();
    allIncidents.forEach(incident => {
      if (incident.incidentTypes) {
        incident.incidentTypes.forEach((type: string) => types.add(type));
      }
    });
    return Array.from(types).sort();
  }, [allIncidents]);

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [];

    let filtered = [...allIncidents];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(incident =>
        incident.detailedDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.incidentTypes?.some((type: string) => type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        incident.completedByFullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.injuredPersonFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.injuredPersonSurname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.homeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.unit?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(incident => {
        const incidentMonth = new Date(incident.date).getMonth() + 1;
        return incidentMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(incident => {
        const incidentYear = new Date(incident.date).getFullYear();
        return incidentYear === parseInt(selectedYear);
      });
    }

    // Apply severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter(incident => incident.incidentLevel === selectedSeverity);
    }

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(incident =>
        incident.incidentTypes?.includes(selectedType)
      );
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`).getTime();
      const dateB = new Date(`${b.date} ${b.time}`).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allIncidents, searchQuery, selectedMonth, selectedYear, selectedSeverity, selectedType, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

  // Handlers
  const handleViewIncident = (incident: any) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredIncidents || filteredIncidents.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Type", "Severity", "Location", "Description", "Injured Person", "Reported By"];
    const rows = filteredIncidents.map(incident => [
      incident.date,
      incident.time,
      incident.incidentTypes?.join("; ") || "",
      incident.incidentLevel?.replace("_", " ") || "",
      `${incident.homeName} - ${incident.unit}`,
      incident.detailedDescription || "",
      `${incident.injuredPersonFirstName} ${incident.injuredPersonSurname}`,
      incident.completedByFullName
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
    a.download = `incidents-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "death":
        return <Heart className="w-4 h-4" />;
      case "permanent_harm":
        return <Shield className="w-4 h-4" />;
      case "minor_injury":
        return <AlertTriangle className="w-4 h-4" />;
      case "no_harm":
        return <Shield className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "death":
        return "bg-red-100 text-red-800 border-red-200";
      case "permanent_harm":
        return "bg-red-100 text-red-800 border-red-200";
      case "minor_injury":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "no_harm":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "fall":
        return <TrendingDown className="w-4 h-4" />;
      case "medication_error":
        return <Pill className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Loading state
  if (!resident || !allIncidents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading incidents...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const incidentStats = {
    total: allIncidents.length,
    thisMonth: allIncidents.filter(incident => {
      const incidentDate = new Date(incident.date);
      const now = new Date();
      return incidentDate.getMonth() === now.getMonth() && incidentDate.getFullYear() === now.getFullYear();
    }).length,
    thisWeek: allIncidents.filter(incident => {
      const incidentDate = new Date(incident.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return incidentDate >= weekAgo;
    }).length,
    severe: allIncidents.filter(incident =>
      incident.incidentLevel === "death" || incident.incidentLevel === "permanent_harm"
    ).length,
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
          onClick={() => router.push(`/dashboard/residents/${id}/incidents`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Incidents & Falls
        </Button>
        <span>/</span>
        <span className="text-foreground">All Incidents</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/incidents`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Incidents History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of incidents and safety reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Incidents</p>
                <p className="text-2xl font-bold text-red-900">{incidentStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{incidentStats.thisMonth}</p>
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
                <p className="text-2xl font-bold text-blue-900">{incidentStats.thisWeek}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Severe Incidents</p>
                <p className="text-2xl font-bold text-orange-900">{incidentStats.severe}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
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
              <span>Filter Incidents</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredIncidents.length === 0}
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
                  placeholder="Search by description, type, location, or person..."
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
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedSeverity}
              onValueChange={(value) => {
                setSelectedSeverity(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="no_harm">No Harm</SelectItem>
                <SelectItem value="minor_injury">Minor Injury</SelectItem>
                <SelectItem value="permanent_harm">Permanent Harm</SelectItem>
                <SelectItem value="death">Death</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Incidents Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Incident Records ({filteredIncidents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incidents found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No incidents recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Injured Person</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIncidents.map((incident) => (
                      <TableRow key={incident._id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{format(new Date(incident.date), "dd MMM yyyy")}</span>
                            <span className="text-xs text-gray-500">{incident.time}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {incident.incidentTypes?.map((type: string, index: number) => (
                              <Badge
                                key={index}
                                className="text-xs bg-blue-100 text-blue-800 border-0"
                              >
                                {getTypeIcon(type)}
                                <span className="ml-1">{type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs border-0 ${getSeverityColor(incident.incidentLevel)}`}>
                            {getSeverityIcon(incident.incidentLevel)}
                            <span className="ml-1">
                              {incident.incidentLevel?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {incident.homeName && incident.unit ? (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <div className="text-sm">
                                <p className="font-medium">{incident.homeName}</p>
                                <p className="text-gray-500">{incident.unit}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {incident.injuredPersonFirstName && incident.injuredPersonSurname ? (
                            <div className="text-sm">
                              <p className="font-medium">
                                {incident.injuredPersonFirstName} {incident.injuredPersonSurname}
                              </p>
                              {incident.injuredPersonDOB && (
                                <p className="text-gray-500">DOB: {incident.injuredPersonDOB}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {incident.completedByFullName ? (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <div className="text-sm">
                                <p className="font-medium">{incident.completedByFullName}</p>
                                {incident.completedByJobTitle && (
                                  <p className="text-gray-500">{incident.completedByJobTitle}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewIncident(incident)}
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
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredIncidents.length)} of {filteredIncidents.length} incidents
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

      {/* View Incident Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Incident Report Details</DialogTitle>
            <DialogDescription>
              Complete incident report for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedIncident && (
              <div className="space-y-6">
                {/* Incident Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Incident Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">
                        {format(new Date(selectedIncident.date), "PPP")} at {selectedIncident.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Level</p>
                      <Badge className={`${getSeverityColor(selectedIncident.incidentLevel)} border-0`}>
                        {getSeverityIcon(selectedIncident.incidentLevel)}
                        <span className="ml-1">
                          {selectedIncident.incidentLevel?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedIncident.homeName} - {selectedIncident.unit}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Types</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedIncident.incidentTypes?.map((type: string, index: number) => (
                          <Badge key={index} variant="secondary">{type.replace("_", " ")}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Injured Person Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Injured Person Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">
                        {selectedIncident.injuredPersonFirstName} {selectedIncident.injuredPersonSurname}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{selectedIncident.injuredPersonDOB}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedIncident.injuredPersonStatus?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Health Care Number</p>
                      <p className="font-medium">{selectedIncident.healthCareNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Detailed Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {selectedIncident.detailedDescription || "No description provided"}
                  </p>
                </div>

                {/* Treatment Information */}
                {(selectedIncident.treatmentTypes?.length > 0 || selectedIncident.treatmentDetails) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Treatment Information</h3>
                    {selectedIncident.treatmentTypes?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-2">Treatment Types</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedIncident.treatmentTypes.map((type: string, index: number) => (
                            <Badge key={index} variant="outline">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedIncident.treatmentDetails && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Treatment Details</p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedIncident.treatmentDetails}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Record Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Report Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Completed By</p>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{selectedIncident.completedByFullName}</p>
                          <p className="text-sm text-gray-600">{selectedIncident.completedByJobTitle}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Completed</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedIncident.dateCompleted}</p>
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