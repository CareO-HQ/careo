"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { supabase } from "@/lib/supabase";
import { formatDateForDisplay, UK_TIMEZONE } from "@/lib/date-utils";
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
  ChevronLeft,
  ChevronRight,
  Droplet,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { generateContinencePDF, type ContinencePdfEntry } from "@/lib/continence-pdf-utils";

type ContinenceDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

type ContinenceSubtype = "bowel" | "urine";

export default function ContinenceDocumentsPage({ params }: ContinenceDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<ContinenceSubtype | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isMonthlyReportDialogOpen, setIsMonthlyReportDialogOpen] = useState(false);
  const [fromMonth, setFromMonth] = useState(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
  const [fromYear, setFromYear] = useState(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
  const [toMonth, setToMonth] = useState(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
  const [toYear, setToYear] = useState(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [paginatedData, setPaginatedData] = useState<{
    dates: Array<{ date: string; hasReport: boolean; bowelCount: number; urineCount: number }>;
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
      let query = supabase
        .from("continence_entries")
        .select("date, entry_type, created_at", { count: "exact" })
        .eq("resident_id", id);

      // Apply date filters
      if (selectedYear !== "all") {
        const year = parseInt(selectedYear);
        if (selectedMonth !== "all") {
          const month = parseInt(selectedMonth);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59);
          query = query
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());
        } else {
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31, 23, 59, 59);
          query = query
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString());
        }
      }

      const { data: entries, error, count } = await query;

      if (error) {
        console.error("Error fetching entries:", error);
        toast.error("Failed to load continence entries");
        return;
      }

      // Get unique dates and per-type counts
      const dateCounts: Record<string, { bowelCount: number; urineCount: number }> = {};
      entries?.forEach((entry: any) => {
        if (!dateCounts[entry.date]) {
          dateCounts[entry.date] = { bowelCount: 0, urineCount: 0 };
        }
        if (entry.entry_type === "bowel") {
          dateCounts[entry.date].bowelCount += 1;
        } else if (entry.entry_type === "urine") {
          dateCounts[entry.date].urineCount += 1;
        }
      });

      const datesArray = Object.entries(dateCounts).map(([date, counts]) => ({
        date,
        hasReport: true,
        bowelCount: counts.bowelCount,
        urineCount: counts.urineCount,
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
        const { data: entries, error } = await supabase
          .from("continence_entries")
          .select(`
            *,
            recorded_by_user:recorded_by (
              id,
              name,
              email
            )
          `)
          .eq("resident_id", id)
          .eq("date", selectedReport.date)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching daily report:", error);
          toast.error("Failed to load report");
          return;
        }

        const bowelEntries = (entries || []).filter((e: any) => e.entry_type === "bowel");
        const urineEntries = (entries || []).filter((e: any) => e.entry_type === "urine");

        setSelectedReportData({
          entries: entries || [],
          bowelEntries,
          urineEntries,
          totalEntries: entries?.length || 0,
          bowelCount: bowelEntries.length,
          urineCount: urineEntries.length,
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
      const ukNow = formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy");
      const currentYear = parseInt(ukNow);
      return [currentYear, currentYear - 1];
    }
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
      hasReport: dateObj.hasReport,
      bowelCount: dateObj.bowelCount,
      urineCount: dateObj.urineCount
    }));
  }, [paginatedData]);

  // Client-side search filter
  const filteredReports = useMemo(() => {
    if (!reportObjects) return [];

    let filtered = [...reportObjects];

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
  const handleViewReport = (report: any, subtype: ContinenceSubtype) => {
    setSelectedReport(report);
    setSelectedSubtype(subtype);
    setIsViewDialogOpen(true);
  };

  const handleDownloadReport = async (report: any, subtype: ContinenceSubtype) => {
    try {
      const { data: entries, error } = await supabase
        .from("continence_entries")
        .select(`
          *,
          recorded_by_user:recorded_by (
            id,
            name,
            email
          )
        `)
        .eq("resident_id", id)
        .eq("date", report.date)
        .eq("entry_type", subtype)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching continence report for download:", error);
        toast.error("Failed to load report data");
        return;
      }

      if (!entries || entries.length === 0) {
        toast.error(`No ${subtype} entries found for this date`);
        return;
      }

      const subtypeLabel = subtype === "bowel" ? "Bowel" : "Urine";
      const reportDate = formatInTimeZone(new Date(`${report.date}T00:00:00`), UK_TIMEZONE, "EEEE, MMMM d, yyyy");
      await generateContinencePDF({
        resident,
        entries: entries as ContinencePdfEntry[],
        title: `${subtypeLabel} Continence Record`,
        periodLabel: `Day: ${reportDate}`,
        orgLogoUrl: profile?.organization_logo_url || undefined,
        careHomeName: profile?.care_home_name || resident?.care_home_name || undefined,
      });
      toast.success(`${subtypeLabel} report downloaded successfully`);
    } catch (error) {
      console.error("Error generating continence download:", error);
      toast.error("Failed to generate report");
    }
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = ["Date", "Report Type", "Status"];
    const rows = filteredReports.map(report => [
      report.date,
      "Daily Continence Report",
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
    a.download = `continence-reports-${fullName.replace(/\s+/g, "-")}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateMonthlyReport = async () => {
    if (!fromMonth || !fromYear || !toMonth || !toYear) {
      toast.error("Please select both From and To month/year");
      return;
    }

    setIsGeneratingReport(true);
    try {
      const startDate = `${fromYear}-${fromMonth.padStart(2, "0")}-01`;
      const lastDay = new Date(parseInt(toYear), parseInt(toMonth), 0).getDate();
      const endDate = `${toYear}-${toMonth.padStart(2, "0")}-${lastDay}`;

      if (new Date(startDate) > new Date(endDate)) {
        toast.error("From month cannot be after To month");
        return;
      }

      const startDateObj = new Date(`${startDate}T00:00:00`);
      const endDateObj = new Date(`${endDate}T23:59:59`);

      // Fetch all entries for selected month range
      const { data: entries, error } = await supabase
        .from("continence_entries")
        .select(`
          *,
          recorded_by_user:recorded_by (
            id,
            name,
            email
          )
        `)
        .eq("resident_id", id)
        .gte("created_at", startDateObj.toISOString())
        .lte("created_at", endDateObj.toISOString())
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        console.error("Error fetching monthly data:", error);
        toast.error("Failed to fetch monthly data");
        return;
      }

      if (!entries || entries.length === 0) {
        toast.error("No records found for the selected period");
        return;
      }

      const fromLabel = new Date(parseInt(fromYear), parseInt(fromMonth) - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
      const toLabel = new Date(parseInt(toYear), parseInt(toMonth) - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
      await generateContinencePDF({
        resident,
        entries: entries as ContinencePdfEntry[],
        title: "Continence Record Statement",
        periodLabel: `Period: ${fromLabel} to ${toLabel}`,
        orgLogoUrl: profile?.organization_logo_url || undefined,
        careHomeName: profile?.care_home_name || resident?.care_home_name || undefined,
      });

      toast.success(`Statement for ${fromLabel} to ${toLabel} downloaded successfully`);
      setIsMonthlyReportDialogOpen(false);
      setFromMonth(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
      setFromYear(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
      setToMonth(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
      setToYear(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
    } catch (error) {
      console.error("Error generating monthly report:", error);
      toast.error("Failed to generate monthly report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Calculate stats
  const reportStats = useMemo(() => {
    if (!paginatedData) return { total: 0, bowel: 0, urine: 0 };

    const total = selectedYear === "all" && selectedMonth === "all"
      ? paginatedData.totalCount
      : paginatedData.totalCount;

    return {
      total,
      bowel: 0,
      urine: 0,
    };
  }, [paginatedData, selectedYear, selectedMonth]);

  // Bristol Stool Chart Types
  const stoolTypes = [
    { id: "type_1", label: "Type 1", description: "Separate hard lumps" },
    { id: "type_2", label: "Type 2", description: "Lumpy and sausage like" },
    { id: "type_3", label: "Type 3", description: "A sausage shape with cracks in the surface" },
    { id: "type_4", label: "Type 4", description: "Like a smooth, soft sausage or snake" },
    { id: "type_5", label: "Type 5", description: "Soft blobs with clear-cut edges" },
    { id: "type_6", label: "Type 6", description: "Mushy consistency with ragged edges" },
    { id: "type_7", label: "Type 7", description: "Liquid consistency with no solid pieces" },
  ];

  // Loading state
  if (!resident || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading continence reports...</p>
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
          onClick={() => router.push(`/dashboard/residents/${id}/continence`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Continence
        </Button>
        <span>/</span>
        <span className="text-foreground">All Records</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/continence`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Droplet className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Continence Records History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of continence records for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-teal-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">Total Reports</p>
                <p className="text-2xl font-bold text-teal-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Bowel Records</p>
                <p className="text-2xl font-bold text-amber-900">{reportStats.bowel}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <User className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Urine Records</p>
                <p className="text-2xl font-bold text-blue-900">{reportStats.urine}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Droplet className="w-5 h-5 text-blue-600" />
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
              onClick={() => setIsMonthlyReportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Month-to-Month PDF
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
            Continence Reports ({totalCount} {selectedYear !== "all" || selectedMonth !== "all" ? "filtered " : ""}dates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <Droplet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No continence reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bowel</TableHead>
                      <TableHead>Urine</TableHead>
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
                          {report.bowelCount > 0 ? (
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2 w-28">
                                <User className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium">{report.bowelCount} entries</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewReport(report, "bowel")}
                                  className="h-8"
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReport(report, "bowel")}
                                  className="h-8"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.urineCount > 0 ? (
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2 w-28">
                                <Droplet className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">{report.urineCount} entries</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewReport(report, "urine")}
                                  className="h-8"
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReport(report, "urine")}
                                  className="h-8"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
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
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) setSelectedSubtype(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSubtype === "bowel" ? "Bowel" : selectedSubtype === "urine" ? "Urine" : "Continence"} Report - {selectedReport && formatDateForDisplay(selectedReport.date)}
            </DialogTitle>
            <DialogDescription>
              Detailed view of all entries for this date
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-4 ${(selectedReportData?.entries?.length || 0) > 3 ? 'overflow-y-auto max-h-[60vh]' : ''}`}>
            {isLoadingReport ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading report...</p>
              </div>
            ) : selectedReportData?.entries && selectedReportData.entries.length > 0 ? (
              <>
                {/* Summary Stats */}
                <div className={`grid ${selectedSubtype ? "grid-cols-1" : "grid-cols-3"} gap-3 pb-4 border-b`}>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">
                      {selectedSubtype === "bowel"
                        ? selectedReportData.bowelCount
                        : selectedSubtype === "urine"
                          ? selectedReportData.urineCount
                          : selectedReportData.totalEntries}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSubtype === "bowel"
                        ? "Bowel Entries"
                        : selectedSubtype === "urine"
                          ? "Urine Entries"
                          : "Total Entries"}
                    </p>
                  </div>
                  {!selectedSubtype && (
                    <>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">{selectedReportData.bowelCount}</p>
                        <p className="text-xs text-muted-foreground">Bowel</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{selectedReportData.urineCount}</p>
                        <p className="text-xs text-muted-foreground">Urine</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Bowel Entries */}
                {(selectedSubtype === null || selectedSubtype === "bowel") && selectedReportData.bowelEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      Bowel Entries ({selectedReportData.bowelCount})
                    </h3>
                    {selectedReportData.bowelEntries.map((entry: any, index: number) => {
                      const stoolTypeLabel = entry.stool_type
                        ? stoolTypes.find((t) => t.id === entry.stool_type)
                        : null;

                      return (
                        <div key={entry.id} className="p-3 border rounded-lg bg-amber-50/50">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                                {entry.time}
                              </Badge>
                            </div>
                          </div>

                          {stoolTypeLabel && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">{stoolTypeLabel.label}</span>
                              <span className="text-muted-foreground"> - {stoolTypeLabel.description}</span>
                            </div>
                          )}

                          {entry.bowel_size && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              Size: <span className="font-medium">{entry.bowel_size.toUpperCase()}</span>
                            </div>
                          )}

                          {entry.notes && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Notes: {entry.notes}
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            Recorded by: {entry.recorded_by_user?.name || entry.recorded_by_user?.email || "Staff"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Urine Entries */}
                {(selectedSubtype === null || selectedSubtype === "urine") && selectedReportData.urineEntries.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-blue-600" />
                      Urine Entries ({selectedReportData.urineCount})
                    </h3>
                    {selectedReportData.urineEntries.map((entry: any, index: number) => {
                      const colorDisplay = entry.urine_color
                        ? entry.urine_color.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                        : '';

                      const aidDisplay = entry.continence_aid
                        ? entry.continence_aid.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                        : '';

                      return (
                        <div key={entry.id} className="p-3 border rounded-lg bg-blue-50/50">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                {entry.time}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-sm">
                            {entry.urine_amount && (
                              <div>
                                <span className="text-muted-foreground">Amount: </span>
                                <span className="font-medium">{entry.urine_amount}</span>
                              </div>
                            )}
                            {entry.urine_color && (
                              <div>
                                <span className="text-muted-foreground">Color: </span>
                                <span className="font-medium">{colorDisplay}</span>
                              </div>
                            )}
                            {entry.continence_aid && (
                              <div>
                                <span className="text-muted-foreground">Aid: </span>
                                <span className="font-medium">{aidDisplay}</span>
                              </div>
                            )}
                          </div>

                          {entry.notes && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Notes: {entry.notes}
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            Recorded by: {entry.recorded_by_user?.name || entry.recorded_by_user?.email || "Staff"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 py-8 text-center">No entries logged for this date</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Dialog */}
      <Dialog open={isMonthlyReportDialogOpen} onOpenChange={setIsMonthlyReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Month-to-Month Statement</DialogTitle>
            <DialogDescription>
              Select a from and to month to download a detailed continence report (similar to a bank statement)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Month</label>
              <Select value={fromMonth} onValueChange={setFromMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Year</label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Month</label>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Year</label>
              <Select value={toYear} onValueChange={setToYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-800 font-medium mb-1">PDF Report Format</p>
              <p className="text-blue-700 text-xs">
                The statement will include: resident details, all bowel and urine entries for the selected month,
                timestamps, staff names, and a summary - formatted like a bank statement. Opens in a new window for printing/saving as PDF.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsMonthlyReportDialogOpen(false);
                  setFromMonth(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
                  setFromYear(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
                  setToMonth(formatInTimeZone(new Date(), UK_TIMEZONE, "M"));
                  setToYear(formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy"));
                }}
                disabled={isGeneratingReport}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateMonthlyReport}
                disabled={isGeneratingReport || !fromMonth || !fromYear || !toMonth || !toYear}
              >
                {isGeneratingReport ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
