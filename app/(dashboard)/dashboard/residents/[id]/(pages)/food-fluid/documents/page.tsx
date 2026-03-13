"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { supabase } from "@/lib/supabase";
import { getUKTodayDate, formatTimestampToUKTime, formatDateForDisplay, UK_TIMEZONE } from "@/lib/date-utils";
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
import { useProfile } from "@/hooks/use-profile";
import { generateFoodFluidPDF } from "@/lib/food-fluid-pdf-utils";

type FoodFluidDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function FoodFluidDocumentsPage({ params }: FoodFluidDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

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

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [paginatedData, setPaginatedData] = useState<{
    dates: Array<{ date: string; hasReport: boolean }>;
    totalCount: number;
    totalPages: number;
  } | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Fetch resident data
  useEffect(() => {
    const fetchResident = async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error fetching resident:", error);
        toast.error("Failed to load resident data");
      } else if (data) {
        setResident(data);
      }
    };
    fetchResident();
  }, [id]);

  // Fetch paginated dates
  const fetchPaginatedDates = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query for food_fluid_logs
      let query = supabase
        .from("food_fluid_logs")
        .select("date, timestamp", { count: "exact" })
        .eq("resident_id", id);

      // Apply date filters
      if (selectedYear !== "all") {
        const year = parseInt(selectedYear);
        if (selectedMonth !== "all") {
          const month = parseInt(selectedMonth);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59);
          query = query
            .gte("timestamp", startDate.toISOString())
            .lte("timestamp", endDate.toISOString());
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31, 23, 59, 59);
          query = query
            .gte("timestamp", startDate.toISOString())
            .lte("timestamp", endDate.toISOString());
        }
      }

      const { data: logs, error, count } = await query;

      if (error) {
        console.error("Error fetching logs:", error);
        toast.error("Failed to load food & fluid logs");
        return;
      }

      // Get unique dates
      const uniqueDates = new Set<string>();
      logs?.forEach((log: any) => {
        // Convert timestamp to UK timezone date string
        const ukDate = formatInTimeZone(new Date(log.timestamp), UK_TIMEZONE, "yyyy-MM-dd");
        uniqueDates.add(ukDate);
      });

      // Convert to array and sort
      const datesArray = Array.from(uniqueDates).map(date => ({
        date,
        hasReport: true
      }));

      // Sort dates
      datesArray.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === "desc" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });

      // Paginate
      const totalCount = datesArray.length;
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedDates = datesArray.slice(startIndex, endIndex);

      setPaginatedData({
        dates: paginatedDates,
        totalCount,
        totalPages
      });
    } catch (error) {
      console.error("Error in fetchPaginatedDates:", error);
      toast.error("Failed to load dates");
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedYear, selectedMonth, sortOrder, currentPage, itemsPerPage]);

  // Fetch paginated dates when filters change
  useEffect(() => {
    fetchPaginatedDates();
  }, [fetchPaginatedDates]);

  // Fetch daily report data
  useEffect(() => {
    const fetchDailyReport = async () => {
      if (!selectedReport?.date) {
        setSelectedReportData(null);
        return;
      }

      setIsLoadingReport(true);
      try {
        const { data: logs, error } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", id)
          .eq("date", selectedReport.date)
          .order("timestamp", { ascending: false });

        if (error) {
          console.error("Error fetching daily report:", error);
          toast.error("Failed to load report");
          return;
        }

        // Transform logs to match expected format
        const transformedLogs = (logs || []).map((log: any) => ({
          typeOfFoodDrink: log.type_of_food_drink,
          amountEaten: log.amount_eaten,
          portionServed: log.portion_served,
          fluidConsumedMl: log.fluid_consumed_ml,
          section: log.section,
          signature: log.signature,
          timestamp: new Date(log.timestamp).getTime()
        }));

        const foodEntries = transformedLogs.filter((log: any) => !log.fluidConsumedMl).length;
        const fluidEntries = transformedLogs.filter((log: any) => log.fluidConsumedMl).length;
        const totalFluidMl = transformedLogs.reduce((sum: number, log: any) => sum + (log.fluidConsumedMl || 0), 0);

        setSelectedReportData({
          logs: transformedLogs,
          reportGenerated: true,
          totalEntries: transformedLogs.length,
          foodEntries,
          fluidEntries,
          totalFluidMl
        });
      } catch (error) {
        console.error("Error in fetchDailyReport:", error);
        toast.error("Failed to load report");
      } finally {
        setIsLoadingReport(false);
      }
    };

    fetchDailyReport();
  }, [selectedReport, id]);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "Unknown Resident";
    return `${resident.first_name} ${resident.last_name}`;
  }, [resident]);

  // Get unique years from dates for filter
  const availableYears = useMemo(() => {
    if (!resident?.created_at) {
      // Return current year and previous year as defaults (UK timezone)
      const ukNow = formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy");
      const currentYear = parseInt(ukNow);
      return [currentYear, currentYear - 1];
    }
    // Get year from resident creation date in UK timezone
    const createdYear = parseInt(formatInTimeZone(new Date(resident.created_at), UK_TIMEZONE, "yyyy"));
    const ukNow = formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy");
    const currentYear = parseInt(ukNow);
    const years: number[] = [];
    for (let year = currentYear; year >= createdYear; year--) {
      years.push(year);
    }
    return years;
  }, [resident?.created_at]);

  // Transform paginated data to match existing format
  const reportObjects = useMemo(() => {
    if (!paginatedData?.dates) return [];

    return paginatedData.dates.map(dateObj => ({
      date: dateObj.date,
      formattedDate: formatDateForDisplay(dateObj.date),
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

    // Download CSV with UK date
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `food-fluid-reports-${fullName.replace(/\s+/g, "-")}-${getUKTodayDate()}.csv`;
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

  const handleDownloadReport = async (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    let reportToDownload = selectedReportData && selectedReport?.date === report.date
      ? selectedReportData
      : null;

    // If data isn't loaded (e.g. from history table directly), fetch it first
    if (!reportToDownload) {
      const loadingToast = toast.loading(`Preparing report for ${formatInTimeZone(new Date(report.date + "T00:00:00"), UK_TIMEZONE, "dd MMM yyyy")}...`);
      try {
        const { data: logs, error } = await supabase
          .from("food_fluid_logs")
          .select("*")
          .eq("resident_id", id)
          .eq("date", report.date)
          .order("timestamp", { ascending: false });

        if (error) throw error;

        const transformedLogs = (logs || []).map((log: any) => ({
          typeOfFoodDrink: log.type_of_food_drink,
          amountEaten: log.amount_eaten,
          portionServed: log.portion_served,
          fluidConsumedMl: log.fluid_consumed_ml,
          section: log.section,
          signature: log.signature,
          timestamp: new Date(log.timestamp).getTime()
        }));

        const foodEntries = transformedLogs.filter((log: any) => !log.fluidConsumedMl).length;
        const fluidEntries = transformedLogs.filter((log: any) => log.fluidConsumedMl).length;
        const totalFluidMl = transformedLogs.reduce((sum: number, log: any) => sum + (log.fluidConsumedMl || 0), 0);

        reportToDownload = {
          logs: transformedLogs,
          reportGenerated: true,
          totalEntries: transformedLogs.length,
          foodEntries,
          fluidEntries,
          totalFluidMl
        };
        toast.dismiss(loadingToast);
      } catch (error) {
        console.error("Error fetching report data for download:", error);
        toast.error("Failed to prepare report data");
        toast.dismiss(loadingToast);
        return;
      }
    }

    if (!reportToDownload || reportToDownload.logs.length === 0) {
      toast.error("No data found for this date");
      return;
    }

    try {
      await generateFoodFluidPDF({
        resident,
        report: reportToDownload,
        date: report.date,
        orgLogoUrl: profile?.organization_logo_url || undefined
      });
      toast.success(`Food & Fluid report generated for ${formatInTimeZone(new Date(report.date + "T00:00:00"), UK_TIMEZONE, "dd MMM yyyy")}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  // Legacy PDF generation removed in favor of jsPDF utility

  // Loading state
  if (!resident || isLoading) {
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
                            <span>{formatInTimeZone(new Date(report.date + "T00:00:00"), UK_TIMEZONE, "dd MMM yyyy")}</span>
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
            <DialogTitle>Food & Fluid Report - {selectedReport && formatDateForDisplay(selectedReport.date)}</DialogTitle>
            <DialogDescription>
              Detailed view of all entries for this date
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 ${(selectedReportData?.logs?.length || 0) > 2 ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
            {isLoadingReport ? (
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
                        {formatTimestampToUKTime(log.timestamp)}
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