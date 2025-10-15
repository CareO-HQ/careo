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
  FileText,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Moon,
} from "lucide-react";
import { toast } from "sonner";

type NightCheckDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function NightCheckDocumentsPage({ params }: NightCheckDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangeFilter, setDateRangeFilter] = useState<"last_7" | "last_30" | "last_90" | "all">("all");
  const itemsPerPage = 30;

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Use server-side pagination query
  const paginatedData = useQuery(api.nightCheckRecordings.getPaginatedNightCheckReports, {
    residentId,
    page: currentPage,
    pageSize: itemsPerPage,
    dateRangeFilter,
    month: selectedMonth !== "all" ? parseInt(selectedMonth) : undefined,
    year: selectedYear !== "all" ? parseInt(selectedYear) : undefined,
  });

  // Get the selected report data when viewing
  const selectedReportData = useQuery(
    api.nightCheckRecordings.getByResidentAndDate,
    selectedReport ? {
      residentId: id as Id<"residents">,
      recordDate: selectedReport.date,
    } : "skip"
  );

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Transform server-side paginated data
  const reportObjects = useMemo(() => {
    if (!paginatedData?.dates) return [];
    return paginatedData.dates.map(dateInfo => ({
      date: dateInfo.date,
      formattedDate: format(new Date(dateInfo.date), "PPP"),
      _id: dateInfo.date,
      hasData: dateInfo.hasData
    }));
  }, [paginatedData]);

  // Get unique years from earliest date for filter
  const availableYears = useMemo(() => {
    if (!paginatedData?.earliestDate) return [];
    const earliestYear = new Date(paginatedData.earliestDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= earliestYear; year--) {
      years.push(year);
    }
    return years;
  }, [paginatedData?.earliestDate]);

  // Client-side search filtering (apply to current page only)
  const filteredReports = useMemo(() => {
    if (!reportObjects) return [];

    if (!searchQuery) return reportObjects;

    return reportObjects.filter(report =>
      report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.date.includes(searchQuery)
    );
  }, [reportObjects, searchQuery]);

  // Pagination state from server
  const totalPages = Math.ceil((paginatedData?.totalCount || 0) / itemsPerPage);
  const paginatedReports = sortOrder === "desc" ? filteredReports : [...filteredReports].reverse();

  // Handlers
  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Report Type", "Status"];
    const rows = filteredReports.map(report => [
      report.date,
      "Night Check Report",
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
    a.download = `night-check-reports-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const reportToDownload = selectedReportData && selectedReport?.date === report.date
      ? selectedReportData
      : [];

    const htmlContent = generatePDFContent({
      resident,
      recordings: reportToDownload,
      date: report.date
    });

    generatePDFFromHTML(htmlContent);
    toast.success('Night check report will open for printing');
  };

  const generatePDFContent = ({ resident, recordings, date }: { resident: any; recordings: any[]; date: string; }) => {
    const totalChecks = recordings.length;

    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const typeLabels: Record<string, string> = {
      night_check: "Night Check",
      positioning: "Positioning",
      pad_change: "Pad Change",
      bed_rails: "Bed Rails Check",
      environmental: "Environmental Check",
      night_note: "Night Note",
      cleaning: "Cleaning"
    };

    return `
      <div class="header">
        <h1>Night Check Report</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Total Checks</h3>
          <p>${totalChecks}</p>
        </div>
        <div class="info-box">
          <h3>Room</h3>
          <p>${resident.roomNumber || 'N/A'}</p>
        </div>
      </div>

      <div class="activities">
        <h2>Night Checks Log</h2>
        ${recordings && recordings.length > 0
          ? recordings.map((recording: any) => `
              <div class="activity-item">
                <strong>${recording.recordTime} - ${typeLabels[recording.checkType] || recording.checkType}</strong><br>
                ${recording.notes ? `Notes: ${recording.notes}` : ''}<br>
                <span style="color: #64748B; font-size: 12px;">Recorded by: ${recording.recordedByName}</span>
              </div>
            `).join('')
          : '<p>No night checks logged for this day.</p>'
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
          <title>Night Check Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
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
  if (!resident || !paginatedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading night check reports...</p>
        </div>
      </div>
    );
  }

  // Calculate stats from paginated data
  const reportStats = {
    total: paginatedData.totalCount || 0,
    thisMonth: reportObjects.filter(report => {
      const reportDate = new Date(report.date);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
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
          onClick={() => router.push(`/dashboard/residents/${id}/night-check`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Night Check
        </Button>
        <span>/</span>
        <span className="text-foreground">All Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/night-check`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Moon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Night Check Reports History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of night check reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Night Reports</p>
                <p className="text-2xl font-bold text-purple-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Moon className="w-5 h-5 text-purple-600" />
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
          <div className="flex flex-col gap-4">
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={dateRangeFilter}
                onValueChange={(value: "last_7" | "last_30" | "last_90" | "all") => {
                  setDateRangeFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7">Last 7 Days</SelectItem>
                  <SelectItem value="last_30">Last 30 Days</SelectItem>
                  <SelectItem value="last_90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search and Other Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by date..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
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
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Night Check Reports ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Moon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No night check reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          {report.hasData ? (
                            <div className="flex items-center space-x-2">
                              <Moon className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">Night Check Report</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.hasData ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              Archived
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                              No Data
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {report.hasData ? (
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewReport(report)}
                                className="h-8 w-8"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadReport(report)}
                                className="h-8 w-8"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
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
                    Page {currentPage} of {totalPages} ({paginatedData?.totalCount || 0} total reports)
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
                      disabled={currentPage === totalPages || !paginatedData?.hasMore}
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
              Night Check Report - {selectedReport && format(new Date(selectedReport.date), "PPP")}
            </DialogTitle>
            <DialogDescription>
              All night checks logged for this day
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(() => {
            if (!selectedReport) return '';
            const checkCount = (selectedReportData || []).length;
            return checkCount > 2 ? 'overflow-y-auto max-h-[60vh]' : '';
          })()}`}>
            {selectedReportData === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading report...</p>
              </div>
            ) : (() => {
              const recordings = selectedReportData || [];

              const typeLabels: Record<string, string> = {
                night_check: "Night Check",
                positioning: "Positioning",
                pad_change: "Pad Change",
                bed_rails: "Bed Rails Check",
                environmental: "Environmental Check",
                night_note: "Night Note",
                cleaning: "Cleaning"
              };

              return recordings.length > 0 ? (
                recordings.map((recording: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{typeLabels[recording.checkType] || recording.checkType}</h4>
                          <Badge variant="outline" className="text-xs">
                            {recording.recordTime}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {recording.notes && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="font-medium">Notes:</span> {recording.notes}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Recorded by: {recording.recordedByName}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 py-8 text-center">
                  No night checks logged for this day
                </p>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
