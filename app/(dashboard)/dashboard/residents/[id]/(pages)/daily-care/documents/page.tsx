"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
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
  Activity,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { formatTimestampToUKTime, formatTimestampToUKDateTime, formatDateForDisplay, UK_TIMEZONE } from "@/lib/date-utils";

type DailyCareDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

// Helper to get day key from a timestamp (8am-8am boundary in UK time)
// Day runs from 8am to 8am next day
function getDayKey(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  // Convert to UK timezone
  const ukDate = toZonedTime(date, UK_TIMEZONE);
  const hour = ukDate.getHours();
  
  // If before 8am, it belongs to previous day
  if (hour < 8) {
    const prevDay = new Date(ukDate);
    prevDay.setDate(prevDay.getDate() - 1);
    return formatInTimeZone(prevDay, UK_TIMEZONE, 'yyyy-MM-dd');
  }
  
  // Otherwise, it belongs to current day
  return formatInTimeZone(ukDate, UK_TIMEZONE, 'yyyy-MM-dd');
}

export default function DailyCareDocumentsPage({ params }: DailyCareDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

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
  const [selectedDayData, setSelectedDayData] = useState<any>(null);
  const [isLoadingDayData, setIsLoadingDayData] = useState(false);

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch resident and all tasks
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !profile?.active_organization_id) return;

      setIsLoading(true);
      try {
        // Fetch resident
        const { data: residentData, error: residentError } = await supabase
          .from("residents")
          .select("*")
          .eq("id", id)
          .single();

        if (residentError) throw residentError;
        setResident(residentData);

        // Fetch all personal care daily records
        const { data: dailyRecords, error: dailyError } = await supabase
          .from("personal_care_daily")
          .select("*")
          .eq("resident_id", id)
          .order("date", { ascending: false });

        if (dailyError) throw dailyError;

        // Fetch all task events
        const { data: taskEvents, error: tasksError } = await supabase
          .from("personal_care_task_events")
          .select("*")
          .eq("resident_id", id)
          .order("created_at", { ascending: false });

        if (tasksError) throw tasksError;

        setAllTasks(taskEvents || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load daily care records");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, profile?.active_organization_id]);

  // Group tasks by day (8am-8am boundary)
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    allTasks.forEach((task) => {
      if (!task.created_at) return;
      const dayKey = getDayKey(task.created_at);
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(task);
    });

    return grouped;
  }, [allTasks]);

  // Get unique days and create report objects
  const reportObjects = useMemo(() => {
    const days = Object.keys(tasksByDay).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
    });

    // Apply date range filter
    let filteredDays = days;
    if (dateRangeFilter !== "all") {
      const now = new Date();
      const cutoffDate = new Date(now);
      if (dateRangeFilter === "last_7") {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (dateRangeFilter === "last_30") {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      } else if (dateRangeFilter === "last_90") {
        cutoffDate.setDate(cutoffDate.getDate() - 90);
      }
      filteredDays = days.filter(day => new Date(day) >= cutoffDate);
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      const month = parseInt(selectedMonth);
      filteredDays = filteredDays.filter(day => {
        const date = parseISO(day);
        return date.getMonth() + 1 === month;
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      const year = parseInt(selectedYear);
      filteredDays = filteredDays.filter(day => {
        const date = parseISO(day);
        return date.getFullYear() === year;
      });
    }

    return filteredDays.map(day => ({
      date: day,
      formattedDate: format(parseISO(day), "PPP"),
      _id: day,
      hasData: tasksByDay[day]?.length > 0,
      taskCount: tasksByDay[day]?.length || 0,
    }));
  }, [tasksByDay, sortOrder, dateRangeFilter, selectedMonth, selectedYear]);

  // Get unique years from data
  const availableYears = useMemo(() => {
    const days = Object.keys(tasksByDay);
    if (days.length === 0) return [];
    const years = new Set<number>();
    days.forEach(day => {
      const date = parseISO(day);
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [tasksByDay]);

  // Client-side search filtering
  const filteredReports = useMemo(() => {
    if (!searchQuery) return reportObjects;
    return reportObjects.filter(report =>
      report.formattedDate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.date.includes(searchQuery)
    );
  }, [reportObjects, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Handlers
  const handleViewReport = async (report: any) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
    setIsLoadingDayData(true);

    try {
      const dayTasks = tasksByDay[report.date] || [];
      setSelectedDayData({
        date: report.date,
        tasks: dayTasks,
      });
    } catch (error) {
      console.error("Error loading day data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoadingDayData(false);
    }
  };

  const handleDownloadPDF = async (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    try {
      const dayTasks = tasksByDay[report.date] || [];
      const dayData = {
        date: report.date,
        tasks: dayTasks,
      };

      // Call PDF generation API
      const response = await fetch('/api/pdf/daily-care', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resident,
          dayData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-care-report-${resident.first_name}-${resident.last_name}-${report.date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = ["Date", "Report Type", "Activities Count", "Status"];
    const rows = filteredReports.map(report => [
      report.date,
      "Daily Care Report",
      report.taskCount.toString(),
      "Archived"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fullName = resident ? `${resident.first_name}-${resident.last_name}` : "resident";
    a.download = `daily-care-reports-${fullName}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate stats
  const reportStats = useMemo(() => {
    const total = reportObjects.length;
    const thisMonth = reportObjects.filter(report => {
      const reportDate = parseISO(report.date);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    }).length;
    return { total, thisMonth };
  }, [reportObjects]);

  // Loading state
  if (isLoading || !resident) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading daily care reports...</p>
        </div>
      </div>
    );
  }

  const fullName = `${resident.first_name} ${resident.last_name}`;

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
        <span className="text-foreground">All Records</span>
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
            <h1 className="text-xl sm:text-2xl font-bold">Daily Care Records History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of daily care records for {fullName} (8am-8am days)
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
                <p className="text-sm font-medium text-blue-700">Total Days</p>
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
                <p className="text-sm font-medium text-purple-700">Total Activities</p>
                <p className="text-2xl font-bold text-purple-900">{allTasks.length}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
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
              <span>Filter Records</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Daily Care Records ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No records found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No daily care records recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date (8am-8am)</TableHead>
                      <TableHead>Activities</TableHead>
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
                            <span>{format(parseISO(report.date), "dd MMM yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">{report.taskCount} activities</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border-0">
                            Recorded
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                              onClick={() => handleDownloadPDF(report)}
                              className="h-8 w-8"
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages} ({filteredReports.length} total records)
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Care Record - {selectedReport && format(parseISO(selectedReport.date), "PPP")}
            </DialogTitle>
            <DialogDescription>
              All activities logged for this day (8am to 8am next day)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingDayData ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading record...</p>
              </div>
            ) : selectedDayData && selectedDayData.tasks.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Total Activities</div>
                      <div className="text-2xl font-bold">{selectedDayData.tasks.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Date</div>
                      <div className="text-lg font-semibold">{format(parseISO(selectedDayData.date), "EEEE, MMMM d, yyyy")}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg mb-3">Activities</h3>
                  {selectedDayData.tasks
                    .sort((a: any, b: any) => {
                      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                      return bTime - aTime;
                    })
                    .map((task: any, index: number) => {
                      const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string } | null;
                      const displayTime = payload?.time || (task.created_at ? formatTimestampToUKTime(task.created_at) : '--');
                      const staffName = payload?.primaryStaff || payload?.staff || 'Staff';
                      const isActivityRecord = task.task_type === 'daily_activity_record';

                      return (
                        <Card key={task.id || index} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {isActivityRecord ? (
                                    <Activity className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <User className="w-4 h-4 text-blue-600" />
                                  )}
                                  <h4 className="font-semibold text-sm">
                                    {isActivityRecord ? 'Daily Activity Record' : task.task_type}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status || 'completed'}
                                  </Badge>
                                </div>
                                {task.notes && (
                                  <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{displayTime}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span>{staffName}</span>
                                  </div>
                                  {payload?.assistedStaff && (
                                    <div className="flex items-center gap-1">
                                      <span>Assisted by: {payload.assistedStaff}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </>
            ) : (
              <p className="text-gray-500 py-8 text-center">
                No activities logged for this day
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
