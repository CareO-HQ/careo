"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { generateHealthMonitoringPDF } from "@/lib/health-monitoring-pdf-utils";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
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
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";

type HealthMonitoringDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

const UK_TIMEZONE = "Europe/London";

export default function HealthMonitoringDocumentsPage({ params }: HealthMonitoringDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  // State for data
  const [resident, setResident] = useState<any>(null);
  const [allVitals, setAllVitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedVitalType, setSelectedVitalType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // Note: Sort is primarily day-based now
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Items per page refers to *aggregated days* or *individual records*? Usually records. 
  // But since we aggregate, let's paginate the *records* and then re-aggregate the visible page? 
  // Or aggregate first then paginate? Aggregating first is better for view consistency.

  // Dialog state
  const [selectedVital, setSelectedVital] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Day View Dialog State
  const [selectedDayVitals, setSelectedDayVitals] = useState<{ date: string; vitals: any[] } | null>(null);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [selectedVitalTypeInDialog, setSelectedVitalTypeInDialog] = useState<string | null>(null);

  // PDF Selection Dialog State
  const [pdfSelectionDialogOpen, setPdfSelectionDialogOpen] = useState(false);
  const [pdfDayVitals, setPdfDayVitals] = useState<{ date: string; vitals: any[] } | null>(null);

  // Monthly Report Dialog State
  const [isMonthlyReportDialogOpen, setIsMonthlyReportDialogOpen] = useState(false);
  const [monthlyReportMonth, setMonthlyReportMonth] = useState("");
  const [monthlyReportYear, setMonthlyReportYear] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedMonthlyVitalType, setSelectedMonthlyVitalType] = useState<string | null>(null);

  // Fetch data with Supabase
  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Fetch Resident
      const { data: residentData, error: residentError } = await supabase
        .from('residents')
        .select('*')
        .eq('id', id)
        .single();

      if (residentError) throw residentError;

      // Map resident data
      setResident({
        firstName: residentData.first_name,
        middleName: residentData.middle_name,
        lastName: residentData.last_name,
        dateOfBirth: residentData.date_of_birth,
        roomNumber: residentData.room_number,
        careHomeName: residentData.care_home_name,
        _id: residentData.id
      });

      // Fetch Vitals
      // We also want to fetch the name of the person who recorded it if possible.
      // Usually stored in 'recorded_by'. We might need to join or just display the ID if joining is complex/slow.
      // For now, let's fetch raw and assume recorded_by contains a name or ID we can't easily resolve without a join
      // If 'recorded_by' is a UUID linked to profiles, we could join.
      const { data: vitalsData, error: vitalsError } = await supabase
        .from('vitals')
        .select('*') // If we need profile name: select('*, profiles:recorded_by(name, email)') but depends on relation setup
        .eq('resident_id', id)
        .order('record_date', { ascending: false })
        .order('record_time', { ascending: false });

      if (vitalsError) throw vitalsError;

      // Transform snake_case to camelCase and normalize
      const transformedVitals = vitalsData?.map(v => ({
        _id: v.id,
        _creationTime: v.created_at, // timestamp
        vitalType: v.vital_type,
        value: v.value,
        value2: v.value2,
        unit: v.unit,
        notes: v.notes,
        recordedBy: v.recorded_by, // This might be a UUID. Ideally we'd resolve this.
        recordDate: v.record_date, // YYYY-MM-DD
        recordTime: v.record_time, // HH:MM
        residentId: v.resident_id
      })) || [];

      setAllVitals(transformedVitals);

    } catch (error) {
      console.error("Error fetching health monitoring data:", error);
      toast.error("Failed to load health records");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Helper to get effective "Care Day" (8 AM to 8 AM)
  const getEffectiveCareDate = (dateStr: string, timeStr: string) => {
    const [hours] = timeStr.split(':').map(Number);
    if (hours < 8) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      date.setDate(date.getDate() - 1);
      return format(date, 'yyyy-MM-dd');
    }
    return dateStr;
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
        (vital.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vital.value?.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
        (vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions]?.label.toLowerCase().includes(searchQuery.toLowerCase()))
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
      // Use explicit string comparison for date/time strings to avoid timezone shift issues during parsing if just using Date() constructor on date-only
      // But here we want standard sort.
      const dateA = new Date(`${a.recordDate}T${a.recordTime}`);
      const dateB = new Date(`${b.recordDate}T${b.recordTime}`);
      return sortOrder === "desc" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [allVitals, searchQuery, selectedMonth, selectedYear, selectedVitalType, sortOrder]);

  // Aggregation by Day (UK Time)
  const aggregatedVitals = useMemo(() => {
    const groups: Map<string, any[]> = new Map();

    filteredVitals.forEach(vital => {
      // Use effective date for grouping (8 AM to 8 AM logic)
      const dateKey = getEffectiveCareDate(vital.recordDate, vital.recordTime);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)?.push(vital);
    });

    return groups;
  }, [filteredVitals]);

  // Pagination logic needs to handle aggregated groups now.
  // It's cleaner to paginate the KEYS (days) or the ITEMS?
  // Let's paginate the ITEMS (filteredVitals) and then aggregate the visible slice?
  // Or paginate the GROUPS?
  // Standard table pagination usually paginates rows.
  // Given "aggregated by day", maybe we just show a list of days?
  // But if a day has 100 entries...
  // Let's stick to paginating the flat list slightly, OR paginate by "Day".
  // "Aggregated by Day" usually implies headers.
  // Let's paginate the *original flat list* and then group the RESULT.
  // This might split a day across pages, which is slightly ugly but predictable.
  // BETTER: Paginate the groups. Show top 5 days per page?
  // Let's paginate groups (keys).

  const aggregatedKeys = Array.from(aggregatedVitals.keys());
  // Sort keys based on sortOrder
  aggregatedKeys.sort((a, b) => {
    return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
  });

  const totalPages = Math.ceil(aggregatedKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleKeys = aggregatedKeys.slice(startIndex, endIndex);

  // Handlers
  const handleViewVital = (vital: any) => {
    setSelectedVital(vital);
    setIsViewDialogOpen(true);
  };

  const handleViewDay = (dateKey: string, dayVitals: any[]) => {
    setSelectedDayVitals({ date: dateKey, vitals: dayVitals });
    setSelectedVitalTypeInDialog(null); // Reset selection when opening
    setIsDayDialogOpen(true);
  };

  const handleDailyPdfExport = (dateKey: string, dayVitals: any[]) => {
    setPdfDayVitals({ date: dateKey, vitals: dayVitals });
    setPdfSelectionDialogOpen(true);
  };

  const handlePdfDownload = async (vitalType: string) => {
    if (!pdfDayVitals || !resident) {
      toast.error("Required data not available");
      return;
    }

    // Filter vitals by selected type
    const filteredVitals = pdfDayVitals.vitals.filter(v => v.vitalType === vitalType);

    if (filteredVitals.length === 0) {
      toast.error("No records found for this vital type");
      return;
    }

    // Sort by time (newest first)
    const sortedVitals = [...filteredVitals].sort((a, b) => a.recordTime < b.recordTime ? 1 : -1);

    // Fetch staff names for recordedBy IDs
    const vitalsWithStaffNames = await Promise.all(
      sortedVitals.map(async (vital) => {
        if (!vital.recordedBy) {
          return { ...vital, recordedByName: '--' };
        }

        const { data: staffData } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', vital.recordedBy)
          .single();

        return {
          ...vital,
          recordedByName: staffData?.name || staffData?.email?.split('@')[0] || '--'
        };
      })
    );

    const vitalConfig = vitalTypeOptions[vitalType as keyof typeof vitalTypeOptions];

    await generateHealthMonitoringPDF({
      resident: {
        first_name: resident.firstName,
        middle_name: resident.middleName,
        last_name: resident.lastName,
        date_of_birth: resident.dateOfBirth,
        room_number: resident.roomNumber,
        care_home_name: resident.careHomeName
      },
      vitals: vitalsWithStaffNames.map(v => ({
        ...v,
        vitalType: v.vitalType,
        recordDate: v.recordDate,
        recordTime: v.recordTime,
        value: v.value,
        value2: v.value2,
        unit: v.unit,
        notes: v.notes,
        recordedByName: v.recordedByName
      })),
      date: pdfDayVitals.date,
      vitalType: vitalType,
      vitalTypeLabel: vitalConfig?.label || vitalType,
      orgLogoUrl: profile?.organization_logo_url || undefined,
      careHomeName: profile?.care_home_name || undefined
    });

    setPdfSelectionDialogOpen(false);
    toast.success("PDF downloaded successfully");
  };

  const handleGenerateMonthlyReport = async () => {
    if (!monthlyReportMonth || !monthlyReportYear || !selectedMonthlyVitalType) {
      toast.error("Please select month, year, and vital type");
      return;
    }

    if (!resident) {
      toast.error("Resident data not available");
      return;
    }

    setIsGeneratingReport(true);
    try {
      const year = parseInt(monthlyReportYear);
      const month = parseInt(monthlyReportMonth);

      // Calculate start and end dates for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Format dates as YYYY-MM-DD for query
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      // Fetch all vitals for the selected month and vital type
      const { data: vitalsData, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('resident_id', id)
        .eq('vital_type', selectedMonthlyVitalType)
        .gte('record_date', startDateStr)
        .lte('record_date', endDateStr)
        .order('record_date', { ascending: true })
        .order('record_time', { ascending: true });

      if (error) {
        console.error("Error fetching monthly data:", error);
        toast.error("Failed to fetch monthly data");
        return;
      }

      if (!vitalsData || vitalsData.length === 0) {
        toast.error("No records found for the selected month and vital type");
        return;
      }

      // Transform vitals data
      const transformedVitals = vitalsData.map(v => ({
        _id: v.id,
        vitalType: v.vital_type,
        value: v.value,
        value2: v.value2,
        unit: v.unit,
        notes: v.notes,
        recordedBy: v.recorded_by,
        recordDate: v.record_date,
        recordTime: v.record_time,
        residentId: v.resident_id
      }));

      // Fetch staff names
      const vitalsWithStaffNames = await Promise.all(
        transformedVitals.map(async (vital) => {
          if (!vital.recordedBy) {
            return { ...vital, recordedByName: '--' };
          }

          const { data: staffData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', vital.recordedBy)
            .single();

          return {
            ...vital,
            recordedByName: staffData?.name || staffData?.email?.split('@')[0] || '--'
          };
        })
      );

      const vitalConfig = vitalTypeOptions[selectedMonthlyVitalType as keyof typeof vitalTypeOptions];
      const monthName = new Date(year, month - 1).toLocaleString('en-GB', { month: 'long' });

      await generateHealthMonitoringPDF({
        resident: {
          first_name: resident.firstName,
          middle_name: resident.middleName,
          last_name: resident.lastName,
          date_of_birth: resident.dateOfBirth,
          room_number: resident.roomNumber,
          care_home_name: resident.careHomeName
        },
        vitals: vitalsWithStaffNames.map(v => ({
          ...v,
          vitalType: v.vitalType,
          recordDate: v.recordDate,
          recordTime: v.recordTime,
          value: v.value,
          value2: v.value2,
          unit: v.unit,
          notes: v.notes,
          recordedByName: v.recordedByName
        })),
        date: `${monthName}-${year}`,
        vitalType: selectedMonthlyVitalType,
        vitalTypeLabel: `${vitalConfig?.label || selectedMonthlyVitalType} - ${monthName} ${year}`,
        orgLogoUrl: profile?.organization_logo_url || undefined,
        careHomeName: profile?.care_home_name || undefined
      });

      toast.success("Monthly report downloaded successfully");
      setIsMonthlyReportDialogOpen(false);
      setMonthlyReportMonth("");
      setMonthlyReportYear("");
      setSelectedMonthlyVitalType(null);
    } catch (error) {
      console.error("Error generating monthly report:", error);
      toast.error("Failed to generate monthly report");
    } finally {
      setIsGeneratingReport(false);
    }
  };



  // Loading state
  if (isLoading) {
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
      const [year, month, day] = vital.recordDate.split('-').map(Number);
      const vitalDate = new Date(year, month - 1, day);
      const now = new Date();
      return vitalDate.getMonth() === now.getMonth() && vitalDate.getFullYear() === now.getFullYear();
    }).length,
    uniqueTypes: new Set(allVitals.map(vital => vital.vitalType)).size,
    thisWeek: allVitals.filter(vital => {
      const [year, month, day] = vital.recordDate.split('-').map(Number);
      const vitalDate = new Date(year, month - 1, day);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-emerald-700">Total Records</p>
                <p className="text-lg font-bold text-emerald-900">{vitalStats.total}</p>
              </div>
              <div className="p-1 bg-white rounded">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-green-700">This Month</p>
                <p className="text-lg font-bold text-green-900">{vitalStats.thisMonth}</p>
              </div>
              <div className="p-1 bg-white rounded">
                <Calendar className="w-3.5 h-3.5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-blue-700">Vital Types</p>
                <p className="text-lg font-bold text-blue-900">{vitalStats.uniqueTypes}</p>
              </div>
              <div className="p-1 bg-white rounded">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-purple-700">This Week</p>
                <p className="text-lg font-bold text-purple-900">{vitalStats.thisWeek}</p>
              </div>
              <div className="p-1 bg-white rounded">
                <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
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
              onClick={() => setIsMonthlyReportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Monthly Report
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by notes, value or type..."
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
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {format(new Date(2000, i, 1), 'MMMM')}
                  </SelectItem>
                ))}
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

      {/* Vitals Table with Aggregation */}
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
            <div className="space-y-6">
              {visibleKeys.map(dateKey => {
                const dayVitals = aggregatedVitals.get(dateKey) || [];
                // Sort vitals within the day as well
                dayVitals.sort((a, b) => { // Sort time desc
                  return a.recordTime < b.recordTime ? 1 : -1;
                });

                // Format the date header
                const [year, month, day] = dateKey.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                const dateLabel = format(dateObj, "EEEE, d MMMM yyyy");

                return (
                  <div key={dateKey} className="border rounded-md overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="bg-gray-50 px-4 py-3 border-b font-medium text-gray-700 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          <div className="flex flex-col">
                            <span>{dateLabel}</span>
                            <span className="text-[10px] text-gray-400 font-normal">Care Day: 08:00 to 07:59 (Next Day)</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-white text-gray-600 font-normal">
                          {dayVitals.length} Records
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDay(dateKey, dayVitals)}
                          className="h-8 px-3 text-gray-600 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDailyPdfExport(dateKey, dayVitals)}
                          className="h-8 px-3 text-gray-600 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2" /> PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, aggregatedKeys.length)} of {aggregatedKeys.length} days
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Vital Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vital Record Details</DialogTitle>
            <DialogDescription>
              Recorded on {selectedVital && (() => {
                const [year, month, day] = selectedVital.recordDate.split('-').map(Number);
                return format(new Date(year, month - 1, day), "PPP");
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedVital && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-gray-500">Vital Type</span>
                  <span className="font-medium flex items-center gap-2">
                    {vitalTypeOptions[selectedVital.vitalType as keyof typeof vitalTypeOptions]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-gray-500">Value</span>
                  <span className="font-bold text-lg">{formatVitalValue(selectedVital)}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium">{selectedVital.recordTime}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 block">Notes</span>
                  <p className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 min-h-[60px]">
                    {selectedVital.notes || "No notes"}
                  </p>
                </div>
                <div className="text-xs text-gray-400 mt-4 text-right">
                  Recorded by ID: {selectedVital.recordedBy}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day View Dialog (Overlay) */}
      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              {selectedDayVitals && (() => {
                const [year, month, day] = selectedDayVitals.date.split('-').map(Number);
                return format(new Date(year, month - 1, day), "EEEE, d MMMM yyyy");
              })()}
            </DialogTitle>
            <DialogDescription>
              {selectedVitalTypeInDialog ? 'View detailed records' : 'Select a vital type to view records'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 py-4">
            {selectedDayVitals && (() => {
              // Group vitals by type
              const vitalsByType: Record<string, any[]> = {};
              selectedDayVitals.vitals.forEach((vital) => {
                if (!vitalsByType[vital.vitalType]) {
                  vitalsByType[vital.vitalType] = [];
                }
                vitalsByType[vital.vitalType].push(vital);
              });

              // Define the order of vital types to display
              const vitalOrder = ['temperature', 'bloodPressure', 'heartRate', 'respiratoryRate', 'oxygenSaturation'];

              // If no vital type selected, show selection grid
              if (!selectedVitalTypeInDialog) {
                return (
                  <div className="space-y-4 px-2">
                    <h3 className="text-sm font-medium text-gray-600">Select a vital type to view:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vitalOrder.map((vitalType) => {
                        const vitals = vitalsByType[vitalType];
                        const vitalConfig = vitalTypeOptions[vitalType as keyof typeof vitalTypeOptions];
                        const Icon = vitalConfig?.icon || Activity;
                        const count = vitals?.length || 0;

                        return (
                          <Button
                            key={vitalType}
                            variant="outline"
                            className={`h-auto p-4 justify-start ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                            disabled={count === 0}
                            onClick={() => setSelectedVitalTypeInDialog(vitalType)}
                          >
                            <div className="flex items-center space-x-3 w-full">
                              <div className={`p-2 rounded-lg bg-${vitalConfig?.color}-100`}>
                                <Icon className={`w-6 h-6 text-${vitalConfig?.color}-600`} />
                              </div>
                              <div className="flex flex-col items-start flex-1">
                                <span className="font-semibold text-base">{vitalConfig?.label}</span>
                                <span className="text-xs text-gray-500">
                                  {count} {count === 1 ? 'record' : 'records'}
                                </span>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                    {Object.keys(vitalsByType).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No vitals recorded for this day</p>
                      </div>
                    )}
                  </div>
                );
              }

              // Show selected vital type data
              const vitals = vitalsByType[selectedVitalTypeInDialog];
              if (!vitals || vitals.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No records found</p>
                  </div>
                );
              }

              const vitalConfig = vitalTypeOptions[selectedVitalTypeInDialog as keyof typeof vitalTypeOptions];
              const Icon = vitalConfig?.icon || Activity;
              const sortedVitals = [...vitals].sort((a, b) => a.recordTime < b.recordTime ? 1 : -1);

              return (
                <div className="space-y-4 px-2">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVitalTypeInDialog(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to selection
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className={`px-4 py-3 bg-${vitalConfig?.color}-50 border-b border-${vitalConfig?.color}-200`}>
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-5 h-5 text-${vitalConfig?.color}-600`} />
                        <h3 className={`font-semibold text-${vitalConfig?.color}-900`}>
                          {vitalConfig?.label || selectedVitalTypeInDialog}
                        </h3>
                        <Badge variant="outline" className="ml-2 bg-white">
                          {vitals.length} {vitals.length === 1 ? 'record' : 'records'}
                        </Badge>
                      </div>
                    </div>
                    <div className="divide-y">
                      {sortedVitals.map((vital) => {
                        const timeDisplay = vital.recordTime.slice(0, 5);
                        return (
                          <div key={vital._id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4 flex-1">
                                <div className="flex items-center space-x-2 min-w-[80px]">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="font-mono font-medium text-gray-700">{timeDisplay}</span>
                                </div>
                                <div className="flex flex-col flex-1">
                                  <div className="font-bold text-lg text-gray-900">
                                    {formatVitalValue(vital)}
                                  </div>
                                  {vital.notes && (
                                    <p className="text-sm text-gray-600 mt-1 italic">
                                      {vital.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-400">
                                <User className="w-3 h-3" />
                                <span className="text-xs">{vital.recordedBy?.substring(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </ScrollArea>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setIsDayDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Selection Dialog */}
      <Dialog open={pdfSelectionDialogOpen} onOpenChange={setPdfSelectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <Download className="w-5 h-5 mr-2 text-primary" />
              Select Vital Type to Download
            </DialogTitle>
            <DialogDescription>
              Choose which vital type you want to export as PDF
              {pdfDayVitals && (() => {
                const [year, month, day] = pdfDayVitals.date.split('-').map(Number);
                return ` for ${format(new Date(year, month - 1, day), "EEEE, d MMMM yyyy")}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {pdfDayVitals && (() => {
              // Group vitals by type
              const vitalsByType: Record<string, any[]> = {};
              pdfDayVitals.vitals.forEach((vital) => {
                if (!vitalsByType[vital.vitalType]) {
                  vitalsByType[vital.vitalType] = [];
                }
                vitalsByType[vital.vitalType].push(vital);
              });

              // Define the order of vital types to display
              const vitalOrder = ['temperature', 'bloodPressure', 'heartRate', 'respiratoryRate', 'oxygenSaturation'];

              return (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-600">Select a vital type to download:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vitalOrder.map((vitalType) => {
                      const vitals = vitalsByType[vitalType];
                      const vitalConfig = vitalTypeOptions[vitalType as keyof typeof vitalTypeOptions];
                      const Icon = vitalConfig?.icon || Activity;
                      const count = vitals?.length || 0;

                      return (
                        <Button
                          key={vitalType}
                          variant="outline"
                          className={`h-auto p-4 justify-start ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-primary'}`}
                          disabled={count === 0}
                          onClick={() => handlePdfDownload(vitalType)}
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <div className={`p-2 rounded-lg bg-${vitalConfig?.color}-100`}>
                              <Icon className={`w-6 h-6 text-${vitalConfig?.color}-600`} />
                            </div>
                            <div className="flex flex-col items-start flex-1">
                              <span className="font-semibold text-base">{vitalConfig?.label}</span>
                              <span className="text-xs text-gray-500">
                                {count} {count === 1 ? 'record' : 'records'}
                              </span>
                            </div>
                            <Download className="w-4 h-4 text-gray-400" />
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  {Object.keys(vitalsByType).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No vitals available to download</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setPdfSelectionDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Dialog */}
      <Dialog open={isMonthlyReportDialogOpen} onOpenChange={setIsMonthlyReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Monthly Statement</DialogTitle>
            <DialogDescription>
              Select month, year, and vital type to download a detailed health monitoring report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedMonthlyVitalType ? (
              <>
                <h3 className="text-sm font-medium text-gray-600">Select a vital type:</h3>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(vitalTypeOptions).map(([key, option]) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="h-auto p-4 justify-start hover:shadow-md"
                        onClick={() => setSelectedMonthlyVitalType(key)}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <div className={`p-2 rounded-lg bg-${option.color}-100`}>
                            <Icon className={`w-6 h-6 text-${option.color}-600`} />
                          </div>
                          <span className="font-semibold text-base">{option.label}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMonthlyVitalType(null)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Change vital type
                  </Button>
                  <Badge variant="outline">
                    {vitalTypeOptions[selectedMonthlyVitalType as keyof typeof vitalTypeOptions]?.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Month</label>
                  <Select value={monthlyReportMonth} onValueChange={setMonthlyReportMonth}>
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
                  <label className="text-sm font-medium">Year</label>
                  <Select value={monthlyReportYear} onValueChange={setMonthlyReportYear}>
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
                    The statement will include: resident details, all {vitalTypeOptions[selectedMonthlyVitalType as keyof typeof vitalTypeOptions]?.label.toLowerCase()} records for the selected month,
                    timestamps, staff names, and measurements.
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMonthlyReportDialogOpen(false);
                      setMonthlyReportMonth("");
                      setMonthlyReportYear("");
                      setSelectedMonthlyVitalType(null);
                    }}
                    disabled={isGeneratingReport}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateMonthlyReport}
                    disabled={isGeneratingReport || !monthlyReportMonth || !monthlyReportYear}
                  >
                    {isGeneratingReport ? "Generating..." : "Generate PDF"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}