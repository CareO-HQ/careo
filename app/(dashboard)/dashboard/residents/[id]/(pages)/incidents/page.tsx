"use client";

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { formatDateForDisplay } from "@/lib/date-utils";
import { format } from "date-fns";
import { generateIncidentPDF } from "./utils";
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
  Plus,
  Folder,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type IncidentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function IncidentsPage({ params }: IncidentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id;

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
  const [isCreationTypeDialogOpen, setIsCreationTypeDialogOpen] = useState(false);
  const [creationType, setCreationType] = useState<"incident" | "fall">("incident");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newIncidentName, setNewIncidentName] = useState("");

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [incidentFolders, setIncidentFolders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set default name when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      const today = format(new Date(), "dd-MM-yyyy");
      setNewIncidentName(today);
    }
  }, [isCreateDialogOpen]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!residentId) return;
      setIsLoading(true);

      try {
        // Fetch resident
        const { data: resData, error: resError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", residentId)
          .single();

        if (resError) throw resError;
        setResident(resData);

        // Fetch incidents
        const { data: incData, error: incError } = await supabase
          .from("incidents")
          .select("*")
          .eq("resident_id", residentId)
          .order("date", { ascending: false })
          .order("time", { ascending: false });

        if (incError) throw incError;
        setAllIncidents(incData || []);

        // Fetch incident folders
        const { data: foldersData, error: foldersError } = await supabase
          .from("incident_folders")
          .select("*")
          .eq("resident_id", residentId)
          .order("created_at", { ascending: false });

        if (foldersError) {
          console.error("Error fetching folders:", foldersError);
        } else {
          setIncidentFolders(foldersData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load incidents data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [residentId]);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "Unknown Resident";
    return `${resident.first_name} ${resident.last_name}`;
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
      if (incident.incident_types) {
        incident.incident_types.forEach((type: string) => types.add(type));
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
        incident.detailed_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.incident_types?.some((type: string) => type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        incident.completed_by_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.injured_person_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.injured_person_surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.home_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      filtered = filtered.filter(incident => incident.incident_level === selectedSeverity);
    }

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(incident =>
        incident.incident_types?.includes(selectedType)
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

  // Handlers
  const handleCreateIncidentFolder = async () => {
    if (!newIncidentName.trim()) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("incident_folders")
        .insert({
          resident_id: residentId,
          name: newIncidentName.trim(),
          folder_type: creationType,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setIncidentFolders([data, ...incidentFolders]);
      setIsCreateDialogOpen(false);
      toast.success("Incident folder created successfully");
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create incident folder");
    }
  };

  const handleViewIncident = (incident: any) => {
    setSelectedIncident(incident);
    setIsViewDialogOpen(true);
  };

  const handleDownloadIncident = async (incidentId: string) => {
    try {
      const incident = allIncidents?.find((i) => i.id === incidentId);
      if (!incident) {
        toast.error("Incident not found");
        return;
      }

      const fullName = `${resident?.first_name} ${resident?.last_name}`;
      // Generate PDF content
      const pdfContent = generateIncidentPDF(incident, fullName);

      // Create a blob and download
      const blob = new Blob([pdfContent], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-report-${incident.date}-${incidentId.slice(-6)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Incident report downloaded successfully");
    } catch (error) {
      console.error("Error downloading incident:", error);
      toast.error("Failed to download incident report");
    }
  };

  const handleExport = () => {
    if (!filteredIncidents || filteredIncidents.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Type", "Severity", "Location", "Description", "Injured Person", "Reported By"];
    const rows = filteredIncidents.map(incident => [
      incident.date,
      incident.time,
      incident.incident_types?.join("; ") || "",
      incident.incident_level?.replace("_", " ") || "",
      `${incident.home_name} - ${incident.unit}`,
      incident.detailed_description || "",
      `${incident.injured_person_first_name} ${incident.injured_person_surname}`,
      incident.completed_by_full_name
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
  if (isLoading || !resident || allIncidents.length === 0 && isLoading) {
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
      incident.incident_level === "death" || incident.incident_level === "permanent_harm"
    ).length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Incidents & Falls</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of incidents and safety reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="border-0 bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-700">Total Incidents</p>
              <p className="text-lg font-bold text-red-900 mt-0.5">{incidentStats.total}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <FileText className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700">This Month</p>
              <p className="text-lg font-bold text-green-900 mt-0.5">{incidentStats.thisMonth}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">This Week</p>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{incidentStats.thisWeek}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <TrendingDown className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-700">Severe Incidents</p>
              <p className="text-lg font-bold text-orange-900 mt-0.5">{incidentStats.severe}</p>
            </div>
            <div className="p-1 bg-white rounded-md">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter Incidents</span>
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

      {/* Incident Folders Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Incident Folders ({incidentFolders.length})</span>
            <Button
              onClick={() => setIsCreationTypeDialogOpen(true)}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Incident
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentFolders.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No incidents found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "Click 'Create Incident' to get started"}
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
                    {/* Incident Folders */}
                    {incidentFolders.map((folder) => {
                      const isFall = folder.folder_type === "fall";
                      return (
                        <TableRow
                          key={folder.id}
                          className={`${isFall
                            ? "bg-red-50/50 hover:bg-red-100/50"
                            : "bg-blue-50/50 hover:bg-blue-100/50"
                            } cursor-pointer`}
                          onClick={() => router.push(`/dashboard/residents/${residentId}/incidents/${folder.id}`)}
                        >
                          <TableCell colSpan={7}>
                            <div className="flex items-center gap-3 py-1">
                              <Folder className={`w-5 h-5 ${isFall ? "text-red-600" : "text-blue-600"}`} />
                              <span className={`font-medium ${isFall ? "text-red-900" : "text-blue-900"}`}>{folder.name}</span>
                              <Badge variant="outline" className={`ml-auto text-xs ${isFall ? "border-red-200 text-red-700 bg-red-50" : ""}`}>
                                {isFall ? "Fall Record" : "Incident Folder"}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination for incidents removed: list now shows only folders */}
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
                        {formatDateForDisplay(selectedIncident.date)} at {selectedIncident.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Level</p>
                      <Badge className={`${getSeverityColor(selectedIncident.incident_level)} border-0`}>
                        {getSeverityIcon(selectedIncident.incident_level)}
                        <span className="ml-1">
                          {selectedIncident.incident_level?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedIncident.home_name} - {selectedIncident.unit}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Incident Types</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedIncident.incident_types?.map((type: string, index: number) => (
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
                        {selectedIncident.injured_person_first_name} {selectedIncident.injured_person_surname}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium">{selectedIncident.injured_person_dob}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">{selectedIncident.injured_person_status?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Health Care Number</p>
                      <p className="font-medium">{selectedIncident.health_care_number || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Detailed Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {selectedIncident.detailed_description || "No description provided"}
                  </p>
                </div>

                {/* Treatment Information */}
                {(selectedIncident.treatment_types?.length > 0 || selectedIncident.treatment_details) && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Treatment Information</h3>
                    {selectedIncident.treatment_types?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-2">Treatment Types</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedIncident.treatment_types.map((type: string, index: number) => (
                            <Badge key={index} variant="outline">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedIncident.treatment_details && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Treatment Details</p>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                          {selectedIncident.treatment_details}
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
                          <p className="font-medium">{selectedIncident.completed_by_full_name}</p>
                          <p className="text-sm text-gray-600">{selectedIncident.completed_by_job_title}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Completed</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedIncident.date_completed}</p>
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
            <Button onClick={() => handleDownloadIncident(selectedIncident.id)}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creation Type Dialog */}
      <Dialog open={isCreationTypeDialogOpen} onOpenChange={setIsCreationTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Record</DialogTitle>
            <DialogDescription>
              What type of record would you like to create?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreationType("incident");
                setIsCreationTypeDialogOpen(false);
                setIsCreateDialogOpen(true);
              }}
              className="h-24 text-sm bg-blue-50/50 hover:bg-blue-100/50 text-blue-600 border border-blue-100 hover:border-blue-200 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <AlertTriangle className="w-6 h-6 text-blue-500" />
              Incident
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreationType("fall");
                setIsCreationTypeDialogOpen(false);
                setIsCreateDialogOpen(true);
              }}
              className="h-24 text-sm bg-red-50/50 hover:bg-red-100/50 text-red-600 border border-red-100 hover:border-red-200 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <TrendingDown className="w-6 h-6 text-red-500" />
              Falls
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Incident Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {creationType === "fall" ? "Create Falls Record" : "Create Incident Record"}
            </DialogTitle>
            <DialogDescription>
              Create a new folder for organizing {creationType === "fall" ? "fall" : "incident"} reports
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                value={newIncidentName}
                onChange={(e) => setNewIncidentName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateIncidentFolder();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Default: Today&apos;s date (dd-MM-yyyy format)
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateIncidentFolder}>
              <Plus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
