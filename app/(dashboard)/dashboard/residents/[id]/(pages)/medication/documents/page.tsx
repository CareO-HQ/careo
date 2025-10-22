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
  Pill,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type MedicationDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

// Dummy medication data
const generateDummyMedicationData = () => {
  const medications = [
    { name: "Paracetamol 500mg", dosage: "2 tablets", route: "Oral", time: "08:00" },
    { name: "Metformin 850mg", dosage: "1 tablet", route: "Oral", time: "08:30" },
    { name: "Amlodipine 5mg", dosage: "1 tablet", route: "Oral", time: "09:00" },
    { name: "Aspirin 75mg", dosage: "1 tablet", route: "Oral", time: "12:00" },
    { name: "Atorvastatin 20mg", dosage: "1 tablet", route: "Oral", time: "20:00" },
    { name: "Ramipril 5mg", dosage: "1 capsule", route: "Oral", time: "08:00" },
  ];

  const statuses = ["administered", "missed", "refused"];
  const staff = ["Sarah Johnson", "Michael Chen", "Emma Williams", "James Brown"];

  const dates = [];
  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const logs = [];
    const numLogs = Math.floor(Math.random() * 4) + 3; // 3-6 logs per day

    for (let j = 0; j < numLogs; j++) {
      const med = medications[Math.floor(Math.random() * medications.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const staffMember = staff[Math.floor(Math.random() * staff.length)];

      logs.push({
        medicationName: med.name,
        dosage: med.dosage,
        route: med.route,
        scheduledTime: med.time,
        administeredTime: status === "administered" ? med.time : undefined,
        status: status,
        signature: staffMember,
        notes: status === "refused" ? "Patient refused medication" : status === "missed" ? "Patient was sleeping" : undefined,
      });
    }

    dates.push({
      date: dateStr,
      logs: logs,
      totalCount: logs.length,
      administeredCount: logs.filter(l => l.status === "administered").length,
      missedCount: logs.filter(l => l.status === "missed").length,
      refusedCount: logs.filter(l => l.status === "refused").length,
    });
  }

  return dates;
};

export default function MedicationDocumentsPage({ params }: MedicationDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Dummy data
  const allDummyData = useMemo(() => generateDummyMedicationData(), []);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from dates for filter
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1];
  }, []);

  // Transform data to match format
  const reportObjects = useMemo(() => {
    return allDummyData.map(dateObj => ({
      date: dateObj.date,
      formattedDate: format(new Date(dateObj.date), "PPP"),
      _id: dateObj.date,
      totalCount: dateObj.totalCount,
      administeredCount: dateObj.administeredCount,
      missedCount: dateObj.missedCount,
      refusedCount: dateObj.refusedCount,
    }));
  }, [allDummyData]);

  // Filter and sort
  const filteredReports = useMemo(() => {
    if (!reportObjects) return [];

    let filtered = [...reportObjects];

    // Filter by year
    if (selectedYear !== "all") {
      filtered = filtered.filter(report => {
        const year = new Date(report.date).getFullYear();
        return year === parseInt(selectedYear);
      });
    }

    // Filter by month
    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => {
        const month = new Date(report.date).getMonth();
        return month === parseInt(selectedMonth);
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date.includes(searchQuery)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [reportObjects, searchQuery, selectedYear, selectedMonth, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const totalCount = filteredReports.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Handlers
  const handleViewReport = (report: any) => {
    const reportData = allDummyData.find(d => d.date === report.date);
    setSelectedReport({ ...report, logs: reportData?.logs || [] });
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Total Medications", "Administered", "Missed", "Refused"];
    const rows = filteredReports.map(report => [
      report.date,
      report.totalCount,
      report.administeredCount,
      report.missedCount,
      report.refusedCount,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medication-reports-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Medication reports exported successfully");
  };

  const handleDownloadReport = (report: any) => {
    toast.success(`Downloading medication report for ${report.formattedDate}`);
  };

  // Calculate stats
  const reportStats = useMemo(() => {
    if (!filteredReports) return { total: 0, thisMonth: 0, thisWeek: 0 };

    const now = new Date();
    const thisMonth = filteredReports.filter(r => {
      const date = new Date(r.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    const thisWeek = filteredReports.filter(r => new Date(r.date) >= oneWeekAgo).length;

    return {
      total: filteredReports.length,
      thisMonth,
      thisWeek
    };
  }, [filteredReports]);

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
          onClick={() => router.push(`/dashboard/residents/${id}/medication`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Medication
        </Button>
        <span>/</span>
        <span className="text-foreground">All Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/medication`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Pill className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Medication Administration Records</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of medication administration for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Reports</p>
                <p className="text-2xl font-bold text-purple-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{reportStats.thisMonth}</p>
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
                <p className="text-sm font-medium text-blue-700">Administered</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredReports.reduce((sum, r) => sum + r.administeredCount, 0)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Pill className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Missed/Refused</p>
                <p className="text-2xl font-bold text-red-900">
                  {filteredReports.reduce((sum, r) => sum + r.missedCount + r.refusedCount, 0)}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
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
              <span>Filter Reports</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredReports.length === 0}
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
                  placeholder="Search by date..."
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
                <SelectItem value="0">January</SelectItem>
                <SelectItem value="1">February</SelectItem>
                <SelectItem value="2">March</SelectItem>
                <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">May</SelectItem>
                <SelectItem value="5">June</SelectItem>
                <SelectItem value="6">July</SelectItem>
                <SelectItem value="7">August</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">October</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">December</SelectItem>
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

      {/* Reports Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Medication Reports ({totalCount} {selectedYear !== "all" || selectedMonth !== "all" ? "filtered " : ""}dates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No medication reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Administered</TableHead>
                      <TableHead className="text-center">Missed</TableHead>
                      <TableHead className="text-center">Refused</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{report.formattedDate}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{report.totalCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800 border-0">
                            {report.administeredCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-yellow-100 text-yellow-800 border-0">
                            {report.missedCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-100 text-red-800 border-0">
                            {report.refusedCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReport(report)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {totalCount} reports
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Medication Administration Record - {selectedReport && format(new Date(selectedReport.date), "PPP")}</DialogTitle>
            <DialogDescription>
              Detailed view of all medication administrations for this date
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(selectedReport?.logs?.length || 0) > 2 ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
            {selectedReport?.logs && selectedReport.logs.length > 0 ? (
              selectedReport.logs.map((log: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{log.medicationName}</h4>
                        <Badge variant="outline" className={`text-xs ${
                          log.status === 'administered' ? 'bg-green-50 text-green-700 border-green-200' :
                          log.status === 'missed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.administeredTime || log.scheduledTime}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span><span className="font-medium">Dosage:</span> {log.dosage}</span>
                    <span><span className="font-medium">Route:</span> {log.route}</span>
                    <span><span className="font-medium">Scheduled:</span> {log.scheduledTime}</span>
                  </div>

                  {log.notes && (
                    <div className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Notes:</span> {log.notes}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    Administered by: {log.signature}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 py-8 text-center">No medication records for this date</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
