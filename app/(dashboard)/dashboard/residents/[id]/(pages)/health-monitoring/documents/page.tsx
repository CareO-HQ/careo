"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Download,
  FileText,
  Filter,
  Search,
  Calendar,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  TrendingUp,
  AlertTriangle,
  Stethoscope
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type HealthMonitoringDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function HealthMonitoringDocumentsPage({ params }: HealthMonitoringDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  const allVitals = useQuery(api.healthMonitoring.getRecentVitals, {
    residentId: id as Id<"residents">,
    limit: 100 // Get more records for the documents page
  });

  // State for filtering
  const [searchTerm, setSearchTerm] = React.useState("");
  const [vitalTypeFilter, setVitalTypeFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

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

  // Filter vitals based on search and filters
  const filteredVitals = React.useMemo(() => {
    if (!allVitals) return [];
    
    return allVitals.filter((vital: any) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !vital.recordedBy?.toLowerCase().includes(searchLower) &&
          !vital.notes?.toLowerCase().includes(searchLower) &&
          !vital.value?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Vital type filter
      if (vitalTypeFilter !== "all" && vital.vitalType !== vitalTypeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === "custom" && startDate && endDate) {
        const vitalDate = new Date(vital.recordDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (vitalDate < start || vitalDate > end) {
          return false;
        }
      } else if (dateFilter !== "all") {
        const vitalDate = new Date(vital.recordDate);
        const today = new Date();
        let daysAgo = 0;
        
        switch (dateFilter) {
          case "today":
            daysAgo = 0;
            break;
          case "week":
            daysAgo = 7;
            break;
          case "month":
            daysAgo = 30;
            break;
          case "3months":
            daysAgo = 90;
            break;
        }
        
        if (daysAgo > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(today.getDate() - daysAgo);
          if (vitalDate < cutoffDate) {
            return false;
          }
        } else if (daysAgo === 0) {
          // Today filter
          if (vitalDate.toDateString() !== today.toDateString()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [allVitals, searchTerm, vitalTypeFilter, dateFilter, startDate, endDate]);

  // Export functionality
  const handleExport = () => {
    if (!filteredVitals || filteredVitals.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Vital Type", "Value", "Unit", "Notes", "Recorded By"];
    const rows = filteredVitals.map((vital: any) => {
      const vitalType = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions]?.label || vital.vitalType;
      return [
        vital.recordDate,
        vital.recordTime,
        vitalType,
        vital.vitalType === "bloodPressure" && vital.value2 ? `${vital.value}/${vital.value2}` : vital.value,
        vital.unit || "",
        vital.notes || "",
        vital.recordedBy
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vitals-history-${resident?.firstName}-${resident?.lastName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

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

      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Vitals History</h1>
              <p className="text-muted-foreground text-sm">Complete health monitoring records</p>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleExport}
          disabled={!filteredVitals || filteredVitals.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Resident Info Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 text-xs">
                    <Stethoscope className="w-3 h-3 mr-1" />
                    {filteredVitals?.length || 0} Records
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by notes or staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Vital Type Filter */}
            <Select value={vitalTypeFilter} onValueChange={setVitalTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All vital types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vital Types</SelectItem>
                {Object.entries(vitalTypeOptions).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <option.icon className={`w-4 h-4 text-${option.color}-600`} />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateFilter === "custom" && (
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vitals Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Vitals Records</span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
              {filteredVitals?.length || 0} records found
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredVitals || filteredVitals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No vitals records found</p>
              <p className="text-sm mt-1">Try adjusting your filters or record new vitals</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/health-monitoring`)}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Health Monitoring
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Vital Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVitals.map((vital: any) => {
                    const vitalConfig = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
                    const Icon = vitalConfig?.icon || Activity;
                    
                    return (
                      <TableRow key={vital._id}>
                        <TableCell className="font-mono text-sm">
                          <div>
                            <div>{vital.recordDate}</div>
                            <div className="text-xs text-gray-500">{vital.recordTime}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-4 h-4 text-${vitalConfig?.color}-600`} />
                            <span>{vitalConfig?.label || vital.vitalType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatVitalValue(vital)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {vital.notes ? (
                            <span className="text-sm text-gray-600">{vital.notes}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {vital.recordedBy}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}