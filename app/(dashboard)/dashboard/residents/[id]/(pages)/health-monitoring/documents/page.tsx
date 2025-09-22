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
import { toast } from "sonner";

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
  
  // State for PDF download
  const [downloadStartDate, setDownloadStartDate] = React.useState("");
  const [downloadEndDate, setDownloadEndDate] = React.useState("");

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

  // PDF download functionality
  const handleDownloadPDF = () => {
    if (!resident) {
      toast.error('Resident data not available');
      return;
    }

    // Validate date range for large datasets
    if (!downloadStartDate || !downloadEndDate) {
      toast.error('Please select both start and end dates for PDF download');
      return;
    }

    const startDateTime = new Date(downloadStartDate);
    const endDateTime = new Date(downloadEndDate);
    
    if (startDateTime > endDateTime) {
      toast.error('Start date cannot be after end date');
      return;
    }

    // Filter vitals for the selected date range
    const filteredForDownload = allVitals?.filter((vital: any) => {
      const vitalDate = new Date(vital.recordDate);
      return vitalDate >= startDateTime && vitalDate <= endDateTime;
    }) || [];

    if (filteredForDownload.length === 0) {
      toast.error('No vitals found in the selected date range');
      return;
    }

    if (filteredForDownload.length > 500) {
      toast.error('Too many records selected. Please choose a smaller date range (max 500 records)');
      return;
    }

    const htmlContent = generatePDFContent({
      resident,
      vitals: filteredForDownload,
      startDate: downloadStartDate,
      endDate: downloadEndDate
    });

    generatePDFFromHTML(htmlContent);
    toast.success('Vitals report will open for printing');
  };

  const generatePDFContent = ({
    resident,
    vitals,
    startDate,
    endDate
  }: {
    resident: any;
    vitals: any[];
    startDate: string;
    endDate: string;
  }) => {
    const fullName = `${resident.firstName} ${resident.lastName}`;
    const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Group vitals by date for better organization
    const vitalsByDate = vitals.reduce((acc: any, vital: any) => {
      if (!acc[vital.recordDate]) {
        acc[vital.recordDate] = [];
      }
      acc[vital.recordDate].push(vital);
      return acc;
    }, {});

    const sortedDates = Object.keys(vitalsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let vitalsHTML = '';
    
    sortedDates.forEach(date => {
      const dayVitals = vitalsByDate[date];
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      vitalsHTML += `
        <div class="date-section">
          <h3 class="date-header">${formattedDate}</h3>
          <table class="vitals-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Vital Type</th>
                <th>Value</th>
                <th>Notes</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
      `;

      dayVitals
        .sort((a: any, b: any) => b.recordTime.localeCompare(a.recordTime))
        .forEach((vital: any) => {
          const vitalConfig = vitalTypeOptions[vital.vitalType as keyof typeof vitalTypeOptions];
          const vitalLabel = vitalConfig?.label || vital.vitalType;
          const formattedValue = formatVitalValue(vital);

          vitalsHTML += `
            <tr>
              <td>${vital.recordTime}</td>
              <td>${vitalLabel}</td>
              <td><strong>${formattedValue}</strong></td>
              <td>${vital.notes || '—'}</td>
              <td>${vital.recordedBy}</td>
            </tr>
          `;
        });

      vitalsHTML += `
            </tbody>
          </table>
        </div>
      `;
    });

    return `
      <div class="header">
        <div class="logo-section">
          <h1>Vitals History Report</h1>
          <p class="facility-name">Care Facility Health Monitoring</p>
        </div>
      </div>
      
      <div class="resident-info">
        <h2>Resident Information</h2>
        <div class="info-grid">
          <div><strong>Name:</strong> ${fullName}</div>
          <div><strong>Room:</strong> ${resident.roomNumber || 'N/A'}</div>
          <div><strong>NHS Number:</strong> ${resident.nhsHealthNumber || 'N/A'}</div>
          <div><strong>Report Period:</strong> ${formattedStartDate} to ${formattedEndDate}</div>
        </div>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-stats">
          <div><strong>Total Records:</strong> ${vitals.length}</div>
          <div><strong>Date Range:</strong> ${sortedDates.length} days</div>
          <div><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div class="vitals-content">
        <h2>Vitals Records</h2>
        ${vitalsHTML}
      </div>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;
  };

  const generatePDFFromHTML = (content: string) => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vitals History Report</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 2cm;
              }
              .no-print {
                display: none !important;
              }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              border-bottom: 3px solid #10b981;
              padding-bottom: 20px;
              margin-bottom: 30px;
              text-align: center;
            }
            .header h1 {
              color: #10b981;
              margin: 0;
              font-size: 28px;
            }
            .facility-name {
              color: #666;
              margin: 5px 0 0 0;
            }
            .resident-info, .summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .resident-info h2, .summary h2, .vitals-content h2 {
              color: #10b981;
              border-bottom: 2px solid #10b981;
              padding-bottom: 10px;
              margin-top: 0;
            }
            .info-grid, .summary-stats {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-top: 15px;
            }
            .date-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .date-header {
              background: #10b981;
              color: white;
              padding: 10px 15px;
              margin: 0 0 15px 0;
              border-radius: 5px;
              font-size: 18px;
            }
            .vitals-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .vitals-table th {
              background: #f1f5f9;
              border: 1px solid #d1d5db;
              padding: 12px 8px;
              text-align: left;
              font-weight: bold;
              color: #374151;
            }
            .vitals-table td {
              border: 1px solid #d1d5db;
              padding: 10px 8px;
              vertical-align: top;
            }
            .vitals-table tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .no-print {
              text-align: center;
              margin-top: 30px;
            }
            .no-print button {
              padding: 10px 20px;
              margin: 0 10px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
            }
            .print-btn {
              background: #10b981;
              color: white;
            }
            .close-btn {
              background: #6b7280;
              color: white;
            }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print">
            <button class="print-btn" onclick="window.print()">Print PDF</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
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
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Input
              type="date"
              value={downloadStartDate}
              onChange={(e) => setDownloadStartDate(e.target.value)}
              className="w-40"
              placeholder="Start date"
            />
            <span className="text-sm text-gray-500">to</span>
            <Input
              type="date"
              value={downloadEndDate}
              onChange={(e) => setDownloadEndDate(e.target.value)}
              className="w-40"
              placeholder="End date"
            />
          </div>
          <Button 
            onClick={handleDownloadPDF}
            disabled={!downloadStartDate || !downloadEndDate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
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