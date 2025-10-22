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
  Utensils,
  ChevronLeft,
  ChevronRight,
  Droplets,
  ClipboardList,
  Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type FoodFluidDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function FoodFluidDocumentsPage({ params }: FoodFluidDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Increased from 10 for better UX

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Use optimized server-side paginated query
  const paginatedData = useQuery(
    api.foodFluidLogs.getPaginatedFoodFluidDates,
    {
      residentId,
      page: currentPage,
      pageSize: itemsPerPage,
      year: selectedYear !== "all" ? parseInt(selectedYear) : undefined,
      month: selectedMonth !== "all" ? parseInt(selectedMonth) : undefined,
      sortOrder: sortOrder,
    }
  );

  // Get the selected report data when viewing
  const selectedReportData = useQuery(
    api.foodFluidLogs.getDailyFoodFluidReport,
    selectedReport ? {
      residentId: id as Id<"residents">,
      date: selectedReport.date
    } : "skip"
  );

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from dates for filter
  const availableYears = useMemo(() => {
    if (!resident?.createdAt) {
      // Return current year and previous year as defaults
      const currentYear = new Date().getFullYear();
      return [currentYear, currentYear - 1];
    }
    const createdYear = new Date(resident.createdAt).getFullYear();
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= createdYear; year--) {
      years.push(year);
    }
    return years;
  }, [resident?.createdAt]);

  // Transform paginated data to match existing format
  const reportObjects = useMemo(() => {
    if (!paginatedData?.dates) return [];

    return paginatedData.dates.map(dateObj => ({
      date: dateObj.date,
      formattedDate: format(new Date(dateObj.date), "PPP"),
      _id: dateObj.date,
      hasReport: dateObj.hasReport
    }));
  }, [paginatedData]);

  // Client-side search filter (only filters current page)
  const filteredReports = useMemo(() => {
    if (!reportObjects) return [];

    let filtered = [...reportObjects];

    // Apply search filter (on current page only)
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date.includes(searchQuery)
      );
    }

    return filtered;
  }, [reportObjects, searchQuery]);

  // Use server-side pagination data
  const totalPages = paginatedData?.totalPages || 0;
  const totalCount = paginatedData?.totalCount || 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);
  const paginatedReports = filteredReports;

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
      "Daily Food & Fluid Report",
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
    a.download = `food-fluid-reports-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate stats from paginated data (MUST be before early return)
  const reportStats = useMemo(() => {
    if (!paginatedData) return { total: 0, thisMonth: 0, thisWeek: 0 };

    // For "All time" view, use totalCount
    // For filtered views, show the filtered total
    const total = selectedYear === "all" && selectedMonth === "all"
      ? paginatedData.totalCount
      : paginatedData.totalCount;

    // Calculate this month/week from total count (approximation)
    // In production, you'd want a separate query for accurate stats
    return {
      total,
      thisMonth: selectedMonth === new Date().getMonth().toString() ? total : 0,
      thisWeek: 0, // Would need separate query for accurate count
    };
  }, [paginatedData, selectedYear, selectedMonth]);

  const handleDownloadReport = (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    const reportToDownload = selectedReportData && selectedReport?.date === report.date
      ? selectedReportData
      : { logs: [], reportGenerated: false, totalEntries: 0, foodEntries: 0, fluidEntries: 0, totalFluidMl: 0 };

    const htmlContent = generatePDFContent({
      resident,
      report: reportToDownload,
      date: report.date
    });

    generatePDFFromHTML(htmlContent);
    toast.success(`Food & Fluid report will open for printing`);
  };

  const generatePDFContent = ({ resident, report, date }: { resident: any; report: any; date: string; }) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="header">
        <h1>Daily Food & Fluid Report</h1>
        <p style="color: #64748B; margin: 0;">${resident.firstName} ${resident.lastName}</p>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Report Date</h3>
          <p>${formattedDate}</p>
        </div>
        <div class="info-box">
          <h3>Total Entries</h3>
          <p>${report.totalEntries || 0}</p>
        </div>
        <div class="info-box">
          <h3>Food Entries</h3>
          <p>${report.foodEntries || 0}</p>
        </div>
        <div class="info-box">
          <h3>Fluid Entries</h3>
          <p>${report.fluidEntries || 0}</p>
        </div>
      </div>

      <div class="activities">
        <h2>Food & Fluid Log</h2>
        ${report.logs && report.logs.length > 0
          ? report.logs.map((log: any) => `
              <div class="log-entry">
                <strong>${log.typeOfFoodDrink}</strong> - ${log.amountEaten}<br>
                Time: ${new Date(log.timestamp).toLocaleTimeString()}<br>
                Staff: ${log.signature}
              </div>
            `).join('')
          : '<p>No entries logged for this date.</p>'
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
          <title>Daily Food & Fluid Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
            .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            .log-entry { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; }
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
  if (!resident || paginatedData === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading food & fluid reports...</p>
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
          onClick={() => router.push(`/dashboard/residents/${id}/food-fluid`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Food & Fluid
        </Button>
        <span>/</span>
        <span className="text-foreground">All Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/food-fluid`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Food & Fluid Reports History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of daily food & fluid reports for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Total Reports</p>
                <p className="text-2xl font-bold text-yellow-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
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
                <p className="text-sm font-medium text-blue-700">Food Reports</p>
                <p className="text-2xl font-bold text-blue-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Utensils className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">Fluid Reports</p>
                <p className="text-2xl font-bold text-cyan-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Droplets className="w-5 h-5 text-cyan-600" />
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
            Food & Fluid Reports ({totalCount} {selectedYear !== "all" || selectedMonth !== "all" ? "filtered " : ""}dates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No food & fluid reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Report Type</TableHead>
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
                          {report.hasReport ? (
                            <div className="flex items-center space-x-2">
                              <Utensils className="w-4 h-4 text-yellow-600" />
                              <span>Daily Food & Fluid Report</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No report</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.hasReport ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              Archived
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 border-0">
                              Not Recorded
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {report.hasReport ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReport(report)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
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
                    Showing {startIndex + 1}-{endIndex} of {totalCount} dates
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
            <DialogTitle>Food & Fluid Report - {selectedReport && format(new Date(selectedReport.date), "PPP")}</DialogTitle>
            <DialogDescription>
              Detailed view of all entries for this date
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(selectedReportData?.logs?.length || 0) > 2 ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
            {selectedReportData === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading report...</p>
              </div>
            ) : selectedReportData?.logs && selectedReportData.logs.length > 0 ? (
              selectedReportData.logs.map((log: any, index: number) => {
                const isFluid = ['Water', 'Tea', 'Coffee', 'Juice', 'Milk'].includes(log.typeOfFoodDrink) || log.fluidConsumedMl;
                return (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{log.typeOfFoodDrink}</h4>
                          <Badge variant="outline" className="text-xs">
                            {isFluid ? 'Fluid' : 'Food'}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <span><span className="font-medium">Section:</span> {log.section?.replace('-', ' - ')}</span>
                      <span><span className="font-medium">Portion:</span> {log.portionServed}</span>
                      <span><span className="font-medium">Amount Eaten:</span> {log.amountEaten}</span>
                      {log.fluidConsumedMl && (
                        <span><span className="font-medium">Volume:</span> {log.fluidConsumedMl}ml</span>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      Recorded by: {log.signature}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 py-8 text-center">No entries logged for this date</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}