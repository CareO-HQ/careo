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
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  TrendingUp,
  AlertTriangle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type HealthMonitoringDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function HealthMonitoringDocumentsPage({ params }: HealthMonitoringDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedVitalType, setSelectedVitalType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedVital, setSelectedVital] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch all vitals
  const allVitals = useQuery(api.healthMonitoring.getRecentVitals, {
    residentId: id as Id<"residents">,
    limit: 1000 // Get all records for documents page
  });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Vital type options with their properties
  const vitalTypeOptions = {
    temperature: {
      label: "Temperature",
      icon: Thermometer,
      color: "red"
    },
    bloodPressure: {
      label: "Blood Pressure",
      icon: Heart,
      color: "blue"
    },
    heartRate: {
      label: "Heart Rate",
      icon: Activity,
      color: "green"
    },
    respiratoryRate: {
      label: "Respiratory Rate",
      icon: Wind,
      color: "purple"
    },
    oxygenSaturation: {
      label: "Oxygen Saturation",
      icon: Droplets,
      color: "cyan"
    },
    weight: {
      label: "Weight",
      icon: TrendingUp,
      color: "orange"
    },
    height: {
      label: "Height",
      icon: TrendingUp,
      color: "indigo"
    },
    glucoseLevel: {
      label: "Blood Sugar",
      icon: Activity,
      color: "pink"
    },
    painLevel: {
      label: "Pain Level",
      icon: AlertTriangle,
      color: "yellow"
    }
  };

  // Helper function to format vital display
  const formatVitalValue = (vital: any) => {
    if (!vital) return "—";

    if (vital.vitalType === "bloodPressure" && vital.value2) {
      return `${vital.value}/${vital.value2} ${vital.unit || "mmHg"}`;
    }

    const unitDisplay = vital.unit ?
      (vital.unit === "celsius" ? "°C" :
       vital.unit === "fahrenheit" ? "°F" :
       vital.unit === "percent" ? "%" :
       vital.unit === "bpm" ? " bpm" :
       vital.unit === "breaths/min" ? "/min" :
       vital.unit) : "";

    return `${vital.value}${unitDisplay}`;
  };

  // Get unique years from vitals for filter
  const availableYears = useMemo(() => {
    if (!allVitals || allVitals.length === 0) return [];
    const years = [...new Set(allVitals.map(vital =>
      new Date(vital.recordDate).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [allVitals]);

  // Filter and sort vitals
  const filteredVitals = useMemo(() => {
    if (!allVitals) return [];

    let filtered = [...allVitals];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(vital =>
        vital.recordedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vital.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vital.value?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions]?.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(vital => {
        const vitalMonth = new Date(vital.recordDate).getMonth() + 1;
        return vitalMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(vital => {
        const vitalYear = new Date(vital.recordDate).getFullYear();
        return vitalYear === parseInt(selectedYear);
      });
    }

    // Apply vital type filter
    if (selectedVitalType !== "all") {
      filtered = filtered.filter(vital => vital.vitalType === selectedVitalType);
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.recordDate} ${a.recordTime}`).getTime();
      const dateB = new Date(`${b.recordDate} ${b.recordTime}`).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [allVitals, searchQuery, selectedMonth, selectedYear, selectedVitalType, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredVitals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVitals = filteredVitals.slice(startIndex, endIndex);

  // Handlers
  const handleViewVital = (vital: any) => {
    setSelectedVital(vital);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredVitals || filteredVitals.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Vital Type", "Value", "Unit", "Notes", "Recorded By"];
    const rows = filteredVitals.map(vital => [
      vital.recordDate,
      vital.recordTime,
      vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions]?.label || vital.vitalType,
      vital.vitalType === "bloodPressure" && vital.value2 ? `${vital.value}/${vital.value2}` : vital.value,
      vital.unit || "",
      vital.notes || "",
      vital.recordedBy
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
    a.download = `health-monitoring-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (!resident || !allVitals) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading health monitoring records...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const vitalStats = {
    total: allVitals.length,
    thisMonth: allVitals.filter(vital => {
      const vitalDate = new Date(vital.recordDate);
      const now = new Date();
      return vitalDate.getMonth() === now.getMonth() && vitalDate.getFullYear() === now.getFullYear();
    }).length,
    uniqueTypes: new Set(allVitals.map(vital => vital.vitalType)).size,
    thisWeek: allVitals.filter(vital => {
      const vitalDate = new Date(vital.recordDate);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return vitalDate >= weekAgo;
    }).length,
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
          onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Health & Monitoring
        </Button>
        <span>/</span>
        <span className="text-foreground">Vitals History</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Health Monitoring History</h1>
            <p className="text-muted-foreground text-sm">
              Complete vitals and health records for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Total Records</p>
                <p className="text-2xl font-bold text-emerald-900">{vitalStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{vitalStats.thisMonth}</p>
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
                <p className="text-sm font-medium text-blue-700">Vital Types</p>
                <p className="text-2xl font-bold text-blue-900">{vitalStats.uniqueTypes}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">This Week</p>
                <p className="text-2xl font-bold text-purple-900">{vitalStats.thisWeek}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Stethoscope className="w-5 h-5 text-purple-600" />
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
              <span>Filter Vitals</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredVitals.length === 0}
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
                  placeholder="Search by vital type, staff, notes, or value..."
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
              value={selectedVitalType}
              onValueChange={(value) => {
                setSelectedVitalType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Vital Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vital Types</SelectItem>
                {Object.entries(vitalTypeOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    {option.label}
                  </SelectItem>
                ))}
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

      {/* Vitals Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Health Monitoring Records ({filteredVitals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVitals.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No vitals found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No health monitoring records recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Vital Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Recorded By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVitals.map((vital) => {
                      const vitalConfig = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
                      const Icon = vitalConfig?.icon || Activity;

                      return (
                        <TableRow key={vital._id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{format(new Date(vital.recordDate), "dd MMM yyyy")}</span>
                              <span className="text-xs text-gray-500">{vital.recordTime}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4 text-gray-600" />
                              <span>{vitalConfig?.label || vital.vitalType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatVitalValue(vital)}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate">{vital.notes || "—"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{vital.recordedBy}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVital(vital)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredVitals.length)} of {filteredVitals.length} records
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

      {/* View Vital Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vital Record Details</DialogTitle>
            <DialogDescription>
              Complete vital sign record for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedVital && (
              <div className="space-y-6">
                {/* Vital Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Vital Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">
                        {format(new Date(selectedVital.recordDate), "PPP")} at {selectedVital.recordTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vital Type</p>
                      <div className="flex items-center space-x-2">
                        {React.createElement(vitalTypeOptions[selectedVital.vitalType as keyof typeof vitalTypeOptions]?.icon || Activity, {
                          className: "w-4 h-4 text-gray-400"
                        })}
                        <p className="font-medium">
                          {vitalTypeOptions[selectedVital.vitalType as keyof typeof vitalTypeOptions]?.label || selectedVital.vitalType}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Value</p>
                      <p className="font-medium text-lg">{formatVitalValue(selectedVital)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Recorded By</p>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedVital.recordedBy}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {selectedVital.notes && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                      {selectedVital.notes}
                    </p>
                  </div>
                )}

                {/* Record Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Record Type</p>
                      <p className="font-medium">Health Monitoring - Vitals</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{format(new Date(selectedVital._creationTime), "PPP")}</p>
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