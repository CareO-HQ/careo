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
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  CheckCircle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  formatDateToLocal,
  isNightShift,
  isDayShift,
  getYesterdayDate,
  formatDateForDisplay
} from "@/lib/date-utils";

type DailyCareDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function DailyCareDocumentsPage({ params }: DailyCareDocumentsPageProps) {
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
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Get all available report dates for this resident
  const availableDates = useQuery(api.personalCare.getAvailableReportDates, { residentId });

  // Get the selected report data when viewing
  const selectedReportData = useQuery(
    api.personalCare.getDailyPersonalCare,
    selectedReport ? {
      residentId: id as Id<"residents">,
      date: selectedReport.date,
    } : "skip"
  );

  // For night reports, we also need yesterday's data (for 8pm+ activities)
  const yesterdayReportData = useQuery(
    api.personalCare.getDailyPersonalCare,
    selectedReport?.type === 'night' ? {
      residentId: id as Id<"residents">,
      date: getYesterdayDate(selectedReport.date),
    } : "skip"
  );

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from dates for filter
  const availableYears = useMemo(() => {
    if (!availableDates || availableDates.length === 0) return [];
    const years = [...new Set(availableDates.map(date =>
      new Date(date).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [availableDates]);

  // Convert dates to report objects for filtering
  const reportObjects = useMemo(() => {
    if (!availableDates) return [];
    return availableDates.map(date => ({
      date,
      formattedDate: format(new Date(date), "PPP"),
      _id: date // Use date as ID for consistency
    }));
  }, [availableDates]);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    if (!reportObjects) return [];

    let filtered = [...reportObjects];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date.includes(searchQuery)
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(report => {
        const reportMonth = new Date(report.date).getMonth() + 1;
        return reportMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(report => {
        const reportYear = new Date(report.date).getFullYear();
        return reportYear === parseInt(selectedYear);
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [reportObjects, searchQuery, selectedMonth, selectedYear, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Handlers
  const handleViewReport = (report: any, type: 'day' | 'night') => {
    setSelectedReport({ ...report, type });
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Day Shift", "Night Shift", "Status"];
    const rows = filteredReports.map(report => [
      report.date,
      "8:00 AM - 8:00 PM",
      "8:00 PM - 8:00 AM",
      "Archived"
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
    a.download = `daily-care-reports-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report: any, type: 'day' | 'night') => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const reportToDownload = selectedReportData && selectedReport?.date === report.date && selectedReport?.type === type
      ? selectedReportData
      : { activities: [], reportGenerated: false };

    const htmlContent = generatePDFContent({
      resident,
      report: reportToDownload,
      type,
      date: report.date
    });

    generatePDFFromHTML(htmlContent);
    toast.success(`${type === 'day' ? 'Day' : 'Night'} report will open for printing`);
  };

  const generatePDFContent = ({ resident, report, type, date }: { resident: any; report: any; type: 'day' | 'night'; date: string; }) => {
    const timeRange = type === 'day' ? '8:00 AM - 8:00 PM' : '8:00 PM - 8:00 AM';
    const shiftName = type === 'day' ? 'Day' : 'Night';
    const completedCount = report.activities?.filter((a: any) => a.status === 'completed').length || 0;
    const totalActivities = report.activities?.length || 0;
    const completionRate = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Daily Care Report - ${shiftName} Shift</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Shift Period</h3>
          <p>${timeRange}</p>
        </div>
        <div class="info-box">
          <h3>Total Activities</h3>
          <p>${totalActivities}</p>
        </div>
        <div class="info-box">
          <h3>Completion Rate</h3>
          <p>${completionRate}%</p>
        </div>
      </div>

      <div class="activities">
        <h2>Activities Log</h2>
        ${report.activities && report.activities.length > 0
          ? report.activities.map((activity: any) => `
              <div class="activity-item">
                <strong>${activity.taskType}</strong><br>
                ${activity.completedAt ? `Completed: ${new Date(activity.completedAt).toLocaleTimeString()}` : 'Status: Pending'}<br>
                ${activity.notes ? `Notes: ${activity.notes}` : ''}
              </div>
            `).join('')
          : '<p>No activities logged for this shift.</p>'
        }
      </div>
    `;
  };

  const generatePDFFromHTML = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Care Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
            .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            .activity-item { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          ${content}
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Print PDF</button>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
  };

  // Loading state
  if (!resident || !availableDates) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading daily care reports...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const reportStats = {
    total: availableDates.length,
    thisMonth: availableDates.filter(date => {
      const reportDate = new Date(date);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    }).length,
    dayShifts: availableDates.length, // Each date has both day and night
    nightShifts: availableDates.length,
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
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Daily Care
        </Button>
        <span>/</span>
        <span className="text-foreground">All Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/daily-care`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care Reports History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of daily care shift reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Reports</p>
                <p className="text-2xl font-bold text-blue-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
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

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Day Shifts</p>
                <p className="text-2xl font-bold text-amber-900">{reportStats.dayShifts}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Sun className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Night Shifts</p>
                <p className="text-2xl font-bold text-indigo-900">{reportStats.nightShifts}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Moon className="w-5 h-5 text-indigo-600" />
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

      {/* Reports Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Daily Care Reports ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No daily care reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day Shift (8AM - 8PM)</TableHead>
                      <TableHead>Night Shift (8PM - 8AM)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => (
                      <TableRow key={report._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(new Date(report.date), "dd MMM yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Sun className="w-4 h-4 text-amber-600" />
                              <span className="text-sm">Day Report</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReport(report, 'day')}
                                className="h-7 px-2"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReport(report, 'day')}
                                className="h-7 px-2"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Moon className="w-4 h-4 text-indigo-600" />
                              <span className="text-sm">Night Report</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReport(report, 'night')}
                                className="h-7 px-2"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReport(report, 'night')}
                                className="h-7 px-2"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border-0">
                            Archived
                          </Badge>
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
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
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

      {/* View Report Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.type === 'day' ? 'Day' : 'Night'} Shift Report - {selectedReport && format(new Date(selectedReport.date), "PPP")}
            </DialogTitle>
            <DialogDescription>
              All activities logged for {selectedReport?.type === 'day' ? '8:00 AM - 8:00 PM' : '8:00 PM - 8:00 AM'}
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(() => {
            if (!selectedReport) return '';
            let activityCount = 0;
            if (selectedReport.type === 'day') {
              activityCount = (selectedReportData?.tasks || []).filter((task: any) => isDayShift(task.createdAt)).length;
            } else {
              const allNightActivities = [
                ...(selectedReportData?.tasks || []),
                ...(yesterdayReportData?.tasks || [])
              ];
              activityCount = allNightActivities.filter(activity => isNightShift(activity.createdAt)).length;
            }
            return activityCount > 2 ? 'overflow-y-auto max-h-[60vh]' : '';
          })()}`}>
            {selectedReportData === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading report...</p>
              </div>
            ) : (() => {
              let activities = [];
              if (selectedReport?.type === 'day') {
                activities = (selectedReportData?.tasks || []).filter((task: any) =>
                  isDayShift(task.createdAt)
                );
              } else {
                const allNightActivities = [
                  ...(selectedReportData?.tasks || []),
                  ...(yesterdayReportData?.tasks || [])
                ];
                activities = allNightActivities.filter(activity =>
                  isNightShift(activity.createdAt)
                );
              }

              return activities.length > 0 ? (
                activities.map((activity: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{activity.taskType}</h4>
                          <Badge variant="outline" className="text-xs">
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.completedAt ? new Date(activity.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>

                    {activity.notes && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="font-medium">Notes:</span> {activity.notes}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Recorded by: {activity.completedBy || 'Unknown'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 py-8 text-center">
                  No activities logged for {selectedReport?.type} shift
                </p>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}