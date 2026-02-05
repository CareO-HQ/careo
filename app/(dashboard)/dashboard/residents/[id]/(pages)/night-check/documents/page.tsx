"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getUKTodayDate } from "@/lib/date-utils";
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

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [paginatedData, setPaginatedData] = useState<{
    dates: Array<{ date: string; hasData: boolean }>;
    totalCount: number;
    hasMore: boolean;
    earliestDate: string | null;
  } | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch resident data
  useEffect(() => {
    const fetchResident = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        setResident(data);
      }
    };
    fetchResident();
  }, [id]);

  // Fetch paginated dates with recordings
  const fetchPaginatedData = useCallback(async () => {
    if (!id || !profile?.active_organization_id) return;
    setIsLoading(true);
    try {
      // Get all recordings for this resident
      const { data: allRecordings, error } = await supabase
        .from('night_check_recordings')
        .select('record_date')
        .eq('resident_id', id)
        .order('record_date', { ascending: false });

      if (error) {
        console.error("Error fetching recordings:", error);
        throw error;
      }

      // Get unique dates - ensure they're in YYYY-MM-DD format
      const datesWithData = [...new Set((allRecordings || []).map(r => {
        // Ensure date is in YYYY-MM-DD format
        let dateStr: string;
        if (typeof r.record_date === 'string') {
          dateStr = r.record_date.split('T')[0]; // Remove time part if present
        } else {
          // Handle Date object or other formats
          dateStr = typeof r.record_date === 'object' && r.record_date instanceof Date
            ? r.record_date.toISOString().split('T')[0]
            : String(r.record_date);
        }
        return dateStr;
      }))];
      
      console.log("Dates with data:", datesWithData.length, datesWithData);
      console.log("Sample record_date types:", (allRecordings || []).slice(0, 3).map(r => ({
        record_date: r.record_date,
        type: typeof r.record_date
      })));

      if (datesWithData.length === 0) {
        setPaginatedData({
          dates: [],
          totalCount: 0,
          hasMore: false,
          earliestDate: null
        });
        setIsLoading(false);
        return;
      }

      // UK TIMEZONE: Get current date in UK timezone
      const today = getUKTodayDate();
      const todayDate = new Date(today + 'T00:00:00');
      todayDate.setHours(0, 0, 0, 0);

      const earliestDataDate = new Date(Math.min(...datesWithData.map(d => new Date(d + 'T00:00:00').getTime())));
      earliestDataDate.setHours(0, 0, 0, 0);

      let startDate = earliestDataDate;
      if (dateRangeFilter === "last_7") {
        startDate = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRangeFilter === "last_30") {
        startDate = new Date(todayDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRangeFilter === "last_90") {
        startDate = new Date(todayDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      }

      // Generate all dates in range
      const allDates: Array<{ date: string; hasData: boolean }> = [];
      const currentDate = new Date(Math.max(startDate.getTime(), earliestDataDate.getTime()));
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= todayDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Apply month/year filters
        let includeDate = true;
        if (selectedMonth !== "all") {
          includeDate = currentDate.getMonth() + 1 === parseInt(selectedMonth);
        }
        if (selectedYear !== "all" && includeDate) {
          includeDate = currentDate.getFullYear() === parseInt(selectedYear);
        }

        if (includeDate) {
          allDates.push({
            date: dateStr,
            hasData: datesWithData.includes(dateStr)
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort newest first
      allDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Paginate
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedDates = allDates.slice(startIndex, endIndex);

      setPaginatedData({
        dates: paginatedDates,
        totalCount: allDates.length,
        hasMore: endIndex < allDates.length,
        earliestDate: (() => {
          const year = earliestDataDate.getFullYear();
          const month = String(earliestDataDate.getMonth() + 1).padStart(2, '0');
          const day = String(earliestDataDate.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })()
      });
    } catch (e) {
      console.error("Error fetching paginated data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id, profile?.active_organization_id, currentPage, dateRangeFilter, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPaginatedData();
  }, [fetchPaginatedData]);

  // Refresh data when page comes into focus (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchPaginatedData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchPaginatedData]);

  // Fetch recordings for selected date
  useEffect(() => {
    const fetchReportData = async () => {
      if (!selectedReport?.date || !id) {
        setSelectedReportData([]);
        return;
      }
      // Ensure date is in YYYY-MM-DD format
      let queryDate = selectedReport.date;
      if (typeof queryDate === 'string') {
        queryDate = queryDate.split('T')[0]; // Remove time part if present
      } else if (queryDate instanceof Date) {
        queryDate = queryDate.toISOString().split('T')[0];
      } else {
        queryDate = String(queryDate);
      }
      
      console.log("Fetching recordings for date:", queryDate, "Type:", typeof queryDate, "resident_id:", id);
      
      // Use UTC date calculation to avoid timezone issues
      const [year, month, day] = queryDate.split('-').map(Number);
      const queryDateObj = new Date(Date.UTC(year, month - 1, day));
      const nextDayObj = new Date(queryDateObj);
      nextDayObj.setUTCDate(nextDayObj.getUTCDate() + 1);
      const nextDayStr = `${nextDayObj.getUTCFullYear()}-${String(nextDayObj.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDayObj.getUTCDate()).padStart(2, '0')}`;
      
      console.log("Query date range: from", queryDate, "to", nextDayStr);
      
      // First, try a simple equality query
      const { data: recDataEq, error: recErrorEq } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .eq('record_date', queryDate)
        .order('record_date_time', { ascending: false });
      
      console.log("Equality query result:", recDataEq?.length || 0, "records, error:", recErrorEq);
      if (recDataEq && recDataEq.length > 0) {
        console.log("Equality query found records with dates:", recDataEq.map(r => r.record_date));
      }
      
      // Also try range query as fallback
      const { data: recData, error: recError } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .gte('record_date', queryDate)
        .lt('record_date', nextDayStr)
        .order('record_date_time', { ascending: false });
      
      console.log("Range query result:", recData?.length || 0, "records, error:", recError);
      if (recData && recData.length > 0) {
        console.log("Range query found records with dates:", recData.map(r => r.record_date));
      }
      
      // Use whichever query returned data (prefer equality, fallback to range)
      const finalData = (recDataEq && recDataEq.length > 0) ? recDataEq : recData;
      const finalError = recErrorEq || recError;

      if (finalError) {
        console.error("Error fetching report data:", finalError);
        setSelectedReportData([]);
        return;
      }

      if (finalData) {
        console.log("Fetched", finalData.length, "recordings for date", queryDate);
        console.log("Sample record dates:", finalData.slice(0, 3).map(r => ({
          id: r.id,
          check_type: r.check_type,
          record_date: r.record_date,
          record_date_type: typeof r.record_date,
          record_time: r.record_time
        })));
        
        const formatted = finalData.map(r => {
          // Normalize record_date to YYYY-MM-DD format
          let normalizedDate = r.record_date;
          if (typeof normalizedDate === 'string') {
            normalizedDate = normalizedDate.split('T')[0];
          } else if (normalizedDate instanceof Date) {
            normalizedDate = normalizedDate.toISOString().split('T')[0];
          }
          
          return {
            _id: r.id,
            checkType: r.check_type,
            recordTime: r.record_time,
            recordDate: normalizedDate,
            checkData: r.check_data,
            notes: r.notes,
            recordedByName: r.recorded_by_name,
            recordedBy: r.recorded_by,
          };
        });
        setSelectedReportData(formatted);
      } else {
        console.log("No data returned from query");
        setSelectedReportData([]);
      }
    };
    fetchReportData();
  }, [selectedReport, id]);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.first_name || !resident?.last_name) return "Unknown Resident";
    return `${resident.first_name} ${resident.last_name}`;
  }, [resident]);

  // Transform paginated data
  const reportObjects = useMemo(() => {
    if (!paginatedData?.dates) return [];
    return paginatedData.dates.map(dateInfo => ({
      date: dateInfo.date,
      formattedDate: format(new Date(dateInfo.date + 'T00:00:00'), "PPP"),
      _id: dateInfo.date,
      hasData: dateInfo.hasData
    }));
  }, [paginatedData]);

  // Get unique years from earliest date for filter
  const availableYears = useMemo(() => {
    if (!paginatedData?.earliestDate) return [];
    const earliestYear = new Date(paginatedData.earliestDate + 'T00:00:00').getFullYear();
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

  // Calculate stats from paginated data (must be before early return)
  const reportStats = useMemo(() => {
    const today = getUKTodayDate();
    const todayDate = new Date(today + 'T00:00:00');
    return {
      total: paginatedData?.totalCount || 0,
      thisMonth: reportObjects.filter(report => {
        const reportDate = new Date(report.date + 'T00:00:00');
        return reportDate.getMonth() === todayDate.getMonth() && reportDate.getFullYear() === todayDate.getFullYear();
      }).length,
    };
  }, [paginatedData, reportObjects]);

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
    const today = getUKTodayDate();
    a.download = `night-check-reports-${fullName.replace(/\s+/g, "-")}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async (report: any) => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    // Fetch recordings for this date if not already loaded
    let reportToDownload = selectedReportData;
    if (!selectedReport || selectedReport.date !== report.date) {
      // Normalize date to YYYY-MM-DD format
      let queryDate = report.date;
      if (typeof queryDate === 'string') {
        queryDate = queryDate.split('T')[0];
      } else if (queryDate instanceof Date) {
        queryDate = queryDate.toISOString().split('T')[0];
      } else {
        queryDate = String(queryDate);
      }
      
      // Use UTC date calculation to avoid timezone issues
      const [year, month, day] = queryDate.split('-').map(Number);
      const queryDateObj = new Date(Date.UTC(year, month - 1, day));
      const nextDayObj = new Date(queryDateObj);
      nextDayObj.setUTCDate(nextDayObj.getUTCDate() + 1);
      const nextDayStr = `${nextDayObj.getUTCFullYear()}-${String(nextDayObj.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDayObj.getUTCDate()).padStart(2, '0')}`;
      
      // Try equality query first
      const { data: recDataEq, error: recErrorEq } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .eq('record_date', queryDate)
        .order('record_date_time', { ascending: false });
      
      // Fallback to range query
      const { data: recData, error: recError } = await supabase
        .from('night_check_recordings')
        .select('*')
        .eq('resident_id', id)
        .gte('record_date', queryDate)
        .lt('record_date', nextDayStr)
        .order('record_date_time', { ascending: false });
      
      // Use whichever query returned data
      const finalData = (recDataEq && recDataEq.length > 0) ? recDataEq : recData;
      const error = recErrorEq || recError;

      if (!error && finalData) {
        reportToDownload = finalData.map(r => {
          // Normalize record_date to YYYY-MM-DD format
          let normalizedDate = r.record_date;
          if (typeof normalizedDate === 'string') {
            normalizedDate = normalizedDate.split('T')[0];
          } else if (normalizedDate instanceof Date) {
            normalizedDate = normalizedDate.toISOString().split('T')[0];
          }
          
          return {
            _id: r.id,
            checkType: r.check_type,
            recordTime: r.record_time,
            recordDate: normalizedDate,
            checkData: r.check_data,
            notes: r.notes,
            recordedByName: r.recorded_by_name,
            recordedBy: r.recorded_by,
          };
        });
      } else {
        reportToDownload = [];
      }
    }

    const htmlContent = generatePDFContent({
      resident,
      recordings: reportToDownload || [],
      date: report.date
    });

    generatePDFFromHTML(htmlContent);
    toast.success('Night check report will open for printing');
  };

  const generatePDFContent = ({ resident, recordings, date }: { resident: any; recordings: any[]; date: string; }) => {
    const totalChecks = recordings.length;

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
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
        <p style="color: #64748B; margin: 0;">${resident.first_name} ${resident.last_name}</p>
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
          <p>${resident.room_number || 'N/A'}</p>
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

  // Loading state (must be after all hooks)
  if (isLoading || !resident || !paginatedData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading night check reports...</p>
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
                            <span>{format(new Date(report.date + 'T00:00:00'), "dd MMM yyyy")}</span>
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
              Night Check Report - {selectedReport && format(new Date(selectedReport.date + 'T00:00:00'), "PPP")}
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
                cleaning: "Cleaning",
                personal_care: "Personal Care Activities"
              };

              const positionLabels: Record<string, string> = {
                left_side: "Left Side",
                right_side: "Right Side",
                back: "Back",
                sitting_up: "Sitting Up"
              };

              const statusLabels: Record<string, string> = {
                asleep: "Asleep",
                awake: "Awake",
                walking: "Walking",
                sitting: "Sitting"
              };

              const skinConditionLabels: Record<string, string> = {
                normal: "Normal",
                dry: "Dry",
                moist: "Moist",
                clammy: "Clammy",
                hot: "Hot",
                cold: "Cold"
              };

              const equipmentLabels: Record<string, string> = {
                bed_rails: "Bed Rails",
                oxygen: "Oxygen Equipment",
                air_bed: "Air Bed / Pressure Mattress",
                call_bell: "Call Bell",
                monitor: "Monitor/Sensors",
                mobility_aids: "Mobility Aids"
              };

              const environmentalLabels: Record<string, string> = {
                window: "Window",
                curtains: "Curtains",
                door: "Door",
                temperature: "Temperature"
              };

              const cleaningLabels: Record<string, string> = {
                bed: "Bed",
                floor: "Floor",
                bathroom: "Bathroom",
                surfaces: "Surfaces",
                bins: "Bins"
              };

              const personalCareLabels: Record<string, string> = {
                bed_bath: "Bed Bath",
                shampoo_in_bed: "Shampoo In Bed",
                shower_shampoo: "Shower + shampoo",
                wash_upper_body: "Wash Upper body",
                wash_lower_body: "Wash Lower Body",
                creams_applied: "Creams Applied",
                shaved: "Shaved",
                oral_care: "Oral Care",
                fingernails_trimmed: "Fingernails Trimmed",
                fingernails_cleaned: "Fingernails Cleaned",
                hair_brushed: "Hair Brushed",
                hair_washed_hairdresser: "Hair washed/set by hairdresser",
                clothing_changed: "Clothing Changed",
                bed_linens_changed: "Bed Linens Changed",
                bed_made: "Bed Made",
                eyeglasses_care: "Eyeglasses Care",
                footwear_care: "Foot Wear Care"
              };

              // Group recordings by check type
              const groupedRecordings = recordings.reduce((acc: any, recording: any) => {
                const type = recording.checkType;
                if (!acc[type]) {
                  acc[type] = [];
                }
                acc[type].push(recording);
                return acc;
              }, {});

              // Define the order of sections
              const sectionOrder = ["night_check", "positioning", "pad_change", "bed_rails", "environmental", "cleaning", "personal_care", "night_note"];

              const renderRecordingDetails = (recording: any, index: number) => {
                let summary = "";

                // Build one-line summary based on check type
                if (recording.checkType === "night_check" && recording.checkData) {
                  const parts: any[] = [];
                  if (recording.checkData.position) parts.push(positionLabels[recording.checkData.position]);
                  if (recording.checkData.status) parts.push(statusLabels[recording.checkData.status]);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "positioning" && recording.checkData) {
                  const parts: any[] = [];
                  if (recording.checkData.position) parts.push(positionLabels[recording.checkData.position]);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "pad_change" && recording.checkData) {
                  const parts: any[] = [];
                  if (recording.checkData.pad_changed) parts.push("Pad Changed");
                  if (recording.checkData.skin_condition) parts.push(`Skin: ${skinConditionLabels[recording.checkData.skin_condition]}`);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "bed_rails" && recording.checkData) {
                  const items = recording.checkData.equipment_checked?.map((item: string) => equipmentLabels[item] || item).join(", ") || "";
                  const parts: any[] = [];
                  if (items) parts.push(items);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "environmental" && recording.checkData) {
                  const items = recording.checkData.items_checked?.map((item: string) => environmentalLabels[item] || item).join(", ") || "";
                  const parts: any[] = [];
                  if (items) parts.push(items);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "cleaning" && recording.checkData) {
                  const items = recording.checkData.items_cleaned?.map((item: string) => cleaningLabels[item] || item).join(", ") || "";
                  const parts: any[] = [];
                  if (items) parts.push(items);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "personal_care" && recording.checkData) {
                  const activities = recording.checkData.activities_performed?.map((item: string) => personalCareLabels[item] || item).join(", ") || "";
                  const parts: any[] = [];
                  if (activities) parts.push(activities);
                  if (recording.checkData.additional_notes) parts.push(recording.checkData.additional_notes);
                  summary = parts.join(" - ");
                } else if (recording.checkType === "night_note" && recording.checkData) {
                  summary = recording.checkData.notes || "";
                } else if (recording.notes) {
                  summary = recording.notes;
                }

                return (
                  <div key={index} className="text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <span className="font-semibold text-gray-900">{recording.recordTime}</span>
                    {summary && <span className="text-gray-600"> - {summary}</span>}
                    <span className="text-xs text-gray-400 ml-2">({recording.recordedByName})</span>
                  </div>
                );
              };

              return recordings.length > 0 ? (
                <div className="space-y-6">
                  {sectionOrder.map((checkType) => {
                    const typeRecordings = groupedRecordings[checkType];
                    if (!typeRecordings || typeRecordings.length === 0) return null;

                    return (
                      <div key={checkType} className="space-y-3">
                        <div className="bg-gray-100 px-3 py-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-gray-900">{typeLabels[checkType]}</h3>
                            <Badge variant="secondary" className="text-xs bg-gray-700 text-white">
                              {typeRecordings.length} {typeRecordings.length === 1 ? 'check' : 'checks'}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 pl-2">
                          {typeRecordings.map((recording: any, index: number) =>
                            renderRecordingDetails(recording, index)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
