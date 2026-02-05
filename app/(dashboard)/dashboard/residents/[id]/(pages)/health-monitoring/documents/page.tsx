"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { jsPDF } from "jspdf";
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
  TrendingUp,
  AlertTriangle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock,
  ChevronUp,
  ChevronDown
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

  // Fetch data with Supabase
  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Fetch Resident
      const { data: residentData, error: residentError } = await supabase
        .from('residents')
        .select('first_name, last_name, id')
        .eq('id', id)
        .single();

      if (residentError) throw residentError;

      // Map resident data
      setResident({
        firstName: residentData.first_name,
        lastName: residentData.last_name,
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
    },
    weight: {
      label: "Weight",
      icon: TrendingUp,
      color: "orange"
    },
    height: {
      label: "Height",
      icon: TrendingUp,
      color: "indigo"
    },
    glucoseLevel: {
      label: "Blood Sugar",
      icon: Activity,
      color: "pink"
    },
    painLevel: {
      label: "Pain Level",
      icon: AlertTriangle,
      color: "yellow"
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
      // Create a date object from the record. Assuming recordDate is YYYY-MM-DD.
      // We want to group by what the *user sees* as the date.
      // Since recordDate is stored as a date string, it likely represents the date they entered.
      // If we just use that string, it's simplest.
      const dateKey = vital.recordDate;
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
    setIsDayDialogOpen(true);
  };

  const generatePDF = (dateKey: string, vitals: any[]) => {
    const doc = new jsPDF();
    const dateLabel = formatInTimeZone(new Date(dateKey), UK_TIMEZONE, "PPP");

    doc.setFontSize(18);
    doc.text(`Health Monitoring: ${dateLabel}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Resident: ${fullName}`, 14, 30);

    let y = 40;

    vitals.forEach((vital, index) => {
      // Simple pagination check
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const timeDisplay = vital.recordTime.slice(0, 5);
      const vitalConfig = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
      const typeLabel = vitalConfig?.label || vital.vitalType;
      const valueDisplay = formatVitalValue(vital);
      const recordedBy = vital.recordedBy ? `(Recorded by: ${vital.recordedBy.slice(0, 8)}...)` : "";

      doc.setFont("helvetica", "bold");
      doc.text(`${timeDisplay} - ${typeLabel}: ${valueDisplay}`, 14, y);

      if (vital.notes) {
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Note: ${vital.notes}`, 20, y);
        doc.setFontSize(12);
      }

      y += 10;
    });

    doc.save(`health-monitoring-${fullName.replace(/\s+/g, "-")}-${dateKey}.pdf`);
  };

  const handleDailyPdfExport = (dateKey: string, dayVitals: any[]) => {
    generatePDF(dateKey, dayVitals);
  };

  const handleExport = () => {
    if (!filteredVitals || filteredVitals.length === 0) return;

    // Quick CSV gen just for this function since I removed the helper
    const vitals = filteredVitals;
    const filename = `health-monitoring-${fullName.replace(/\s+/g, "-")}-${formatInTimeZone(new Date(), UK_TIMEZONE, "yyyy-MM-dd")}.csv`;

    const headers = ["Date", "Time", "Vital Type", "Value", "Unit", "Notes", "Recorded By"];
    const rows = vitals.map(vital => [
      vital.recordDate,
      vital.recordTime,
      vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions]?.label || vital.vitalType,
      vital.vitalType === "bloodPressure" && vital.value2 ? `${vital.value}/${vital.value2}` : vital.value,
      vital.unit || "",
      vital.notes || "",
      vital.recordedBy
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
      const vitalDate = new Date(vital.recordDate);
      const now = new Date();
      return vitalDate.getMonth() === now.getMonth() && vitalDate.getFullYear() === now.getFullYear();
    }).length,
    uniqueTypes: new Set(allVitals.map(vital => vital.vitalType)).size,
    thisWeek: allVitals.filter(vital => {
      const vitalDate = new Date(vital.recordDate);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Total Records</p>
                <p className="text-2xl font-bold text-emerald-900">{vitalStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">{vitalStats.thisMonth}</p>
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
                <p className="text-sm font-medium text-blue-700">Vital Types</p>
                <p className="text-2xl font-bold text-blue-900">{vitalStats.uniqueTypes}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">This Week</p>
                <p className="text-2xl font-bold text-purple-900">{vitalStats.thisWeek}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Stethoscope className="w-5 h-5 text-purple-600" />
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
              onClick={handleExport}
              disabled={filteredVitals.length === 0}
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
                const dateObj = new Date(dateKey);
                const dateLabel = formatInTimeZone(dateObj, UK_TIMEZONE, "EEEE, d MMMM yyyy");

                return (
                  <div key={dateKey} className="border rounded-md overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="bg-gray-50 px-4 py-3 border-b font-medium text-gray-700 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          {dateLabel}
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
              Recorded on {selectedVital && formatInTimeZone(new Date(selectedVital.recordDate), UK_TIMEZONE, "PPP")}
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
              {selectedDayVitals && formatInTimeZone(new Date(selectedDayVitals.date), UK_TIMEZONE, "EEEE, d MMMM yyyy")}
            </DialogTitle>
            <DialogDescription>
              Full list of vitals recorded on this day.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {selectedDayVitals && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead>Vital Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDayVitals.vitals.sort((a, b) => a.recordTime < b.recordTime ? 1 : -1).map((vital) => {
                    const vitalConfig = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
                    const Icon = vitalConfig?.icon || Activity;
                    const timeDisplay = vital.recordTime.slice(0, 5);

                    return (
                      <TableRow key={vital._id}>
                        <TableCell className="font-medium font-mono text-gray-600">
                          {timeDisplay}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-4 h-4 text-${vitalConfig?.color}-500`} />
                            <span>{vitalConfig?.label || vital.vitalType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatVitalValue(vital)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-gray-500">{vital.notes || "—"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-500">{vital.recordedBy?.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => setIsDayDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}