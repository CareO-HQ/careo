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
  ArrowLeft,
  Search,
  Calendar,
  FileText,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Activity,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { formatTimestampToUKTime, UK_TIMEZONE } from "@/lib/date-utils";
import { generateDailyRecordPDF } from "@/lib/daily-record-pdf-utils";

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

// Activity labels mapping
const activityLabels: Record<string, string> = {
  bed_bath: "Bed Bath",
  shampoo_in_bed: "Shampoo In Bed",
  shower_shampoo: "Shower + Shampoo",
  wash_upper_body: "Wash Upper Body",
  wash_lower_body: "Wash Lower Body",
  creams_applied: "Creams Applied",
  shaved: "Shaved",
  oral_care: "Oral Care",
  fingernails_trimmed: "Fingernails Trimmed",
  fingernails_cleaned: "Fingernails Cleaned",
  hair_brushed: "Hair Brushed",
  hair_washed_hairdresser: "Hair Washed/Set by Hairdresser",
  clothing_changed: "Clothing Changed",
  bed_linens_changed: "Bed Linens Changed",
  bed_made: "Bed Made",
  eyeglasses_care: "Eyeglasses Care",
  footwear_care: "Footwear Care",
};

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

  // Expanded days state
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Monthly download state
  const [selectedDownloadMonth, setSelectedDownloadMonth] = useState<string>("");
  const [selectedDownloadYear, setSelectedDownloadYear] = useState<string>("");
  const [isDownloadingMonthly, setIsDownloadingMonthly] = useState(false);

  // Monthly activity record download state
  const [selectedActivityMonth, setSelectedActivityMonth] = useState<string>("");
  const [selectedActivityYear, setSelectedActivityYear] = useState<string>("");
  const [isDownloadingActivity, setIsDownloadingActivity] = useState(false);

  // Data state
  const [resident, setResident] = useState<any>(null);
  const [activeOrganization, setActiveOrganization] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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

        // Fetch organization for logo
        if (profile?.active_organization_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", profile.active_organization_id)
            .single();
          if (orgData) setActiveOrganization(orgData);
        }

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

        // Fetch all users for name mapping
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("*")
          .eq("active_organization_id", profile?.active_organization_id);

        if (usersError) {
          console.error("Error fetching users:", usersError);
        }

        setAllTasks(taskEvents || []);
        setUsers(usersData || []);
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

  // Separate personal care activities and daily activity records by day
  const personalCareByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.keys(tasksByDay).forEach(day => {
      grouped[day] = tasksByDay[day].filter(task => task.task_type !== 'daily_activity_record');
    });
    return grouped;
  }, [tasksByDay]);

  const dailyActivityByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.keys(tasksByDay).forEach(day => {
      grouped[day] = tasksByDay[day].filter(task => task.task_type === 'daily_activity_record');
    });
    return grouped;
  }, [tasksByDay]);

  // Get unique days and create separate report objects for each document type
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

    // Create a single document for each day, aggregating both types
    const reports: any[] = [];
    filteredDays.forEach(day => {
      const personalCareCount = personalCareByDay[day]?.length || 0;
      const activityRecordCount = dailyActivityByDay[day]?.length || 0;

      if (personalCareCount > 0 || activityRecordCount > 0) {
        reports.push({
          date: day,
          formattedDate: format(parseISO(day), "PPP"),
          _id: day,
          hasData: true,
          personalCareCount,
          activityRecordCount,
        });
      }
    });

    return reports;
  }, [tasksByDay, personalCareByDay, dailyActivityByDay, sortOrder, dateRangeFilter, selectedMonth, selectedYear]);

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

  // Helper to get user display name
  const getUserDisplayName = (identifier: string | undefined): string => {
    if (!identifier) return 'Staff';

    // Try to find user by ID, email, or username
    const user = users.find(u =>
      u.id === identifier ||
      u.email === identifier ||
      u.username === identifier
    );

    if (user) {
      // Return full name if available, otherwise email or username
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      if (user.first_name) return user.first_name;
      if (user.name) return user.name;
      if (user.email) return user.email;
    }

    return identifier;
  };

  // Handlers
  const handleToggleDay = (id: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDownloadPDF = async (report: any, docType: 'personal_care' | 'activity_record') => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    try {
      const dayTasks = docType === 'personal_care'
        ? (personalCareByDay[report.date] || [])
        : (dailyActivityByDay[report.date] || []);

      await generateDailyRecordPDF({
        resident,
        recordType: docType,
        periodType: 'daily',
        date: report.date,
        tasks: dayTasks,
        users,
        orgLogoUrl: activeOrganization?.logo_url,
        careHomeName: activeOrganization?.name || profile?.care_home_name
      });

      const typeName = docType === 'personal_care' ? 'Personal Care Record' : 'Daily Activity Record';
      toast.success(`${typeName} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDownloadMonthlyReport = async () => {
    if (!selectedDownloadMonth || !selectedDownloadYear || !resident) {
      toast.error('Please select both month and year');
      return;
    }

    setIsDownloadingMonthly(true);
    try {
      const monthKey = `${selectedDownloadYear}-${selectedDownloadMonth.padStart(2, '0')}`;
      const monthStart = parseISO(`${monthKey}-01`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of the month

      // Get all tasks for the selected month
      const monthTasks = allTasks.filter((task) => {
        if (!task.created_at || task.task_type === 'daily_activity_record') return false;
        const taskDay = getDayKey(task.created_at);
        return taskDay >= format(monthStart, 'yyyy-MM-dd') && taskDay <= format(monthEnd, 'yyyy-MM-dd');
      });

      // Group tasks by day
      const tasksByDayForMonth: Record<string, any[]> = {};
      monthTasks.forEach((task) => {
        const dayKey = getDayKey(task.created_at);
        if (!tasksByDayForMonth[dayKey]) {
          tasksByDayForMonth[dayKey] = [];
        }
        tasksByDayForMonth[dayKey].push(task);
      });

      await generateDailyRecordPDF({
        resident,
        recordType: 'personal_care',
        periodType: 'monthly',
        month: parseInt(selectedDownloadMonth),
        year: parseInt(selectedDownloadYear),
        tasksByDay: tasksByDayForMonth,
        users,
        orgLogoUrl: activeOrganization?.logo_url,
        careHomeName: activeOrganization?.name || profile?.care_home_name
      });

      toast.success(`Monthly report for ${format(monthStart, 'MMMM yyyy')} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading monthly PDF:', error);
      toast.error('Failed to download monthly PDF');
    } finally {
      setIsDownloadingMonthly(false);
    }
  };

  const handleDownloadActivityRecord = async () => {
    if (!selectedActivityMonth || !selectedActivityYear || !resident) {
      toast.error('Please select both month and year');
      return;
    }

    setIsDownloadingActivity(true);
    try {
      const monthKey = `${selectedActivityYear}-${selectedActivityMonth.padStart(2, '0')}`;
      const monthStart = parseISO(`${monthKey}-01`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0); // Last day of the month

      // Get all activity records for the selected month
      const activityRecords = allTasks.filter((task) => {
        if (!task.created_at || task.task_type !== 'daily_activity_record') return false;
        const taskDay = getDayKey(task.created_at);
        return taskDay >= format(monthStart, 'yyyy-MM-dd') && taskDay <= format(monthEnd, 'yyyy-MM-dd');
      });

      // Group activity records by day
      const activityByDay: Record<string, any[]> = {};
      activityRecords.forEach((task) => {
        const dayKey = getDayKey(task.created_at);
        if (!activityByDay[dayKey]) {
          activityByDay[dayKey] = [];
        }
        activityByDay[dayKey].push(task);
      });

      await generateDailyRecordPDF({
        resident,
        recordType: 'activity_record',
        periodType: 'monthly',
        month: parseInt(selectedActivityMonth),
        year: parseInt(selectedActivityYear),
        tasksByDay: activityByDay,
        users,
        orgLogoUrl: activeOrganization?.logo_url,
        careHomeName: activeOrganization?.name || profile?.care_home_name
      });

      toast.success(`Activity record for ${format(monthStart, 'MMMM yyyy')} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading activity record PDF:', error);
      toast.error('Failed to download activity record PDF');
    } finally {
      setIsDownloadingActivity(false);
    }
  };

  const handleExport = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = ["Date", "Personal Care Activities", "Daily Activity Records"];
    const rows = filteredReports.map(report => [
      report.date,
      report.personalCareCount.toString(),
      report.activityRecordCount.toString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const nameStr = resident ? [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join('-') : "resident";
    const fullName = resident ? nameStr : "resident";
    a.download = `daily-care-reports-${fullName}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate stats
  const reportStats = useMemo(() => {
    const total = reportObjects.length;
    const personalCareCount = reportObjects.reduce((acc, r) => acc + (r.personalCareCount > 0 ? 1 : 0), 0);
    const activityRecordCount = reportObjects.reduce((acc, r) => acc + (r.activityRecordCount > 0 ? 1 : 0), 0);
    const thisMonth = reportObjects.filter(report => {
      const reportDate = parseISO(report.date);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    }).length;
    return { total, thisMonth, personalCareCount, activityRecordCount };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Personal Care Records</p>
                <p className="text-2xl font-bold text-blue-900">{reportStats.personalCareCount}</p>
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
                <p className="text-sm font-medium text-green-700">Activity Records</p>
                <p className="text-2xl font-bold text-green-900">{reportStats.activityRecordCount}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Documents</p>
                <p className="text-2xl font-bold text-purple-900">{reportStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">This Month</p>
                <p className="text-2xl font-bold text-amber-900">{reportStats.thisMonth}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Care Record */}
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-blue-600" />
              <span>Download Monthly Personal Care Record</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Select value={selectedDownloadMonth} onValueChange={setSelectedDownloadMonth}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Month" />
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
              <Select value={selectedDownloadYear} onValueChange={setSelectedDownloadYear}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleDownloadMonthlyReport}
                disabled={!selectedDownloadMonth || !selectedDownloadYear || isDownloadingMonthly}
                className="w-full"
              >
                {isDownloadingMonthly ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Record
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Record */}
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-green-600" />
              <span>Download Monthly Activity Record</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Select value={selectedActivityMonth} onValueChange={setSelectedActivityMonth}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Month" />
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
              <Select value={selectedActivityYear} onValueChange={setSelectedActivityYear}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleDownloadActivityRecord}
                disabled={!selectedActivityMonth || !selectedActivityYear || isDownloadingActivity}
                className="w-full"
              >
                {isDownloadingActivity ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Record
                  </>
                )}
              </Button>
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
            Daily Care Documents ({filteredReports.length})
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
                      <TableHead className="w-[20%]">Date</TableHead>
                      <TableHead className="w-[40%]">Personal Care</TableHead>
                      <TableHead className="w-[40%]">Daily Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.map((report) => {
                      const isExpanded = expandedDays.has(report._id);
                      // Combine tasks for the day and sort chronologically
                      const dayTasks = [
                        ...(personalCareByDay[report.date] || []),
                        ...(dailyActivityByDay[report.date] || [])
                      ].sort((a: any, b: any) => {
                        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return bTime - aTime;
                      });

                      return (
                        <React.Fragment key={report._id}>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="font-medium cursor-pointer" onClick={() => handleToggleDay(report._id)}>
                              <div className="flex items-center space-x-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{format(parseISO(report.date), "dd MMM yyyy")}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {report.personalCareCount > 0 ? (
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2 w-28">
                                    <Activity className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium">{report.personalCareCount} activities</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleDay(report._id)}
                                      className="h-8"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadPDF(report, 'personal_care')}
                                      className="h-8"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ) : <span className="text-muted-foreground text-sm">-</span>}
                            </TableCell>
                            <TableCell>
                              {report.activityRecordCount > 0 ? (
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2 w-28">
                                    <Activity className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium">{report.activityRecordCount} records</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleDay(report._id)}
                                      className="h-8"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadPDF(report, 'activity_record')}
                                      className="h-8"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ) : <span className="text-muted-foreground text-sm">-</span>}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={3} className="bg-muted/20 p-6">
                                <div>
                                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                                    Daily Activities - {format(parseISO(report.date), "EEEE, MMMM d, yyyy")}
                                  </h4>
                                  {dayTasks.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[30%]">Activity</TableHead>
                                            <TableHead className="w-[15%]">Time</TableHead>
                                            <TableHead className="w-[25%]">Staff</TableHead>
                                            <TableHead className="w-[30%]">Notes</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {dayTasks.map((task: any, index: number) => {
                                            const payload = task.payload as { time?: string; primaryStaff?: string; assistedStaff?: string; staff?: string } | null;
                                            const displayTime = payload?.time || (task.created_at ? formatTimestampToUKTime(task.created_at) : '--');
                                            const staffIdentifier = payload?.primaryStaff || payload?.staff;
                                            const staffName = getUserDisplayName(staffIdentifier);
                                            const assistedStaffName = payload?.assistedStaff ? getUserDisplayName(payload.assistedStaff) : null;
                                            const isActivityRecord = task.task_type === 'daily_activity_record';
                                            const activityName = isActivityRecord
                                              ? 'Daily Activity Record'
                                              : (activityLabels[task.task_type] || task.task_type);

                                            return (
                                              <TableRow key={task.id || index}>
                                                <TableCell className="font-medium">
                                                  <div className="flex items-center space-x-2">
                                                    <Badge variant={isActivityRecord ? 'secondary' : 'default'} className={isActivityRecord ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-blue-100 text-blue-800 hover:bg-blue-100'}>
                                                      {isActivityRecord ? 'Activity' : 'Personal Care'}
                                                    </Badge>
                                                    <span>{activityName}</span>
                                                  </div>
                                                </TableCell>
                                                <TableCell>{displayTime}</TableCell>
                                                <TableCell>
                                                  <div>
                                                    <div>{staffName}</div>
                                                    {assistedStaffName && (
                                                      <div className="text-xs text-muted-foreground">Assisted: {assistedStaffName}</div>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                  {task.notes || '--'}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No activities recorded for this day
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
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

    </div>
  );
}
