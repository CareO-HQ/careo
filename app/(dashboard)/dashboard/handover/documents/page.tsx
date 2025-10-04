"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useActiveTeam } from "@/hooks/use-active-team";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Search,
  Calendar,
  Filter,
  Download,
  Eye,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Clock,
} from "lucide-react";

export default function HandoverDocumentsPage() {
  const router = useRouter();
  const { activeTeamId } = useActiveTeam();

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedShift, setSelectedShift] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedHandover, setSelectedHandover] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch handover reports from Convex
  const handovers = useQuery(
    api.handoverReports.getHandoverReportsByTeam,
    activeTeamId ? { teamId: activeTeamId } : "skip"
  );

  // Get unique years
  const availableYears = useMemo(() => {
    if (!handovers || handovers.length === 0) return [2025, 2024];
    const years = [...new Set(handovers.map((h: any) =>
      new Date(h.date).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [handovers]);

  // Group handovers by date
  const groupedHandovers = useMemo(() => {
    if (!handovers) return [];

    // Group by date
    const grouped = handovers.reduce((acc: any, handover: any) => {
      const date = handover.date;
      if (!acc[date]) {
        acc[date] = { date, day: null, night: null };
      }
      if (handover.shift === "day") {
        acc[date].day = handover;
      } else {
        acc[date].night = handover;
      }
      return acc;
    }, {});

    let filtered = Object.values(grouped);

    // Apply filters
    if (searchQuery) {
      filtered = filtered.filter((item: any) =>
        item.date.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMonth !== "all") {
      filtered = filtered.filter((item: any) => {
        const month = new Date(item.date).getMonth() + 1;
        return month === parseInt(selectedMonth);
      });
    }

    if (selectedYear !== "all") {
      filtered = filtered.filter((item: any) => {
        const year = new Date(item.date).getFullYear();
        return year === parseInt(selectedYear);
      });
    }

    if (selectedShift !== "all") {
      filtered = filtered.filter((item: any) => {
        return item[selectedShift] !== null;
      });
    }

    // Sort by date
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [handovers, searchQuery, selectedMonth, selectedYear, selectedShift, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(groupedHandovers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHandovers = groupedHandovers.slice(startIndex, endIndex);

  // Calculate stats
  const handoverStats = {
    total: handovers?.length || 0,
    day: handovers?.filter((h: any) => h.shift === "day").length || 0,
    night: handovers?.filter((h: any) => h.shift === "night").length || 0,
  };

  // Loading state
  if (handovers === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading handover reports...</p>
        </div>
      </div>
    );
  }

  const handleViewHandover = (handover: any) => {
    setSelectedHandover(handover);
    setIsViewDialogOpen(true);
  };

  const handleDownloadReport = (handover: any) => {
    const htmlContent = generatePDFContent(handover);
    generatePDFFromHTML(htmlContent);
  };

  const generatePDFContent = (handover: any) => {
    const formattedDate = format(new Date(handover.date), "EEEE, dd MMMM yyyy");
    const shiftLabel = handover.shift === "day" ? "DAY SHIFT" : "NIGHT SHIFT";

    return `
      <div class="header">
        <h1>HANDOVER REPORT</h1>
        <p style="color: #64748B; margin: 5px 0;">${handover.teamName}</p>
        <p style="font-size: 14px; margin: 5px 0;">${formattedDate}</p>
        <p style="font-weight: bold; margin: 5px 0;">${shiftLabel}</p>
      </div>

      <div class="section">
        <h2>Report Overview</h2>
        <div class="info-grid">
          <div class="info-box">
            <h3>Date</h3>
            <p>${format(new Date(handover.date), "PPP")}</p>
          </div>
          <div class="info-box">
            <h3>Shift</h3>
            <p>${handover.shift === "day" ? "Day Shift" : "Night Shift"}</p>
          </div>
          <div class="info-box">
            <h3>Team</h3>
            <p>${handover.teamName}</p>
          </div>
          <div class="info-box">
            <h3>Total Residents</h3>
            <p>${handover.residentHandovers?.length || 0}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Resident Handovers</h2>
        ${handover.residentHandovers?.map((resident: any) => `
          <div class="resident-card">
            <h3 style="margin-bottom: 5px; font-size: 16px;">${resident.residentName}</h3>
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 10px;">
              ${resident.age} years old • Room ${resident.roomNumber || "—"}
            </p>

            <div class="stats-grid">
              <div>
                <p class="label">Food Intake</p>
                <p class="value">${resident.foodIntakeCount} meals</p>
              </div>
              <div>
                <p class="label">Fluid Total</p>
                <p class="value">${resident.totalFluid} ml</p>
              </div>
              <div>
                <p class="label">Incidents</p>
                <p class="value">${resident.incidentCount}</p>
              </div>
              <div>
                <p class="label">Hospital Transfer</p>
                <p class="value">${resident.hospitalTransferCount}</p>
              </div>
            </div>

            ${resident.comments ? `
              <div style="margin-top: 10px;">
                <p class="label">Comments</p>
                <p style="font-size: 14px; color: #374151; white-space: pre-wrap;">${resident.comments}</p>
              </div>
            ` : ''}
          </div>
        `).join('') || '<p>No resident handovers recorded.</p>'}
      </div>

      <div class="section">
        <h2>Record Information</h2>
        <div class="info-grid">
          <div class="info-box">
            <h3>Created By</h3>
            <p>${handover.createdByName}</p>
          </div>
          <div class="info-box">
            <h3>Date Created</h3>
            <p>${format(new Date(handover.createdAt), "PPP p")}</p>
          </div>
        </div>
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
          <title>Handover Report</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000000;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000000;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section h2 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              border-bottom: 1px solid #000000;
              padding-bottom: 5px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .info-box h3 {
              font-size: 12px;
              color: #6B7280;
              margin: 0 0 5px 0;
              font-weight: normal;
            }
            .info-box p {
              font-size: 14px;
              font-weight: 500;
              margin: 0;
            }
            .resident-card {
              border: 1px solid #000000;
              padding: 15px;
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-top: 10px;
            }
            .label {
              font-size: 12px;
              color: #6B7280;
              margin: 0 0 3px 0;
            }
            .value {
              font-size: 14px;
              font-weight: 500;
              margin: 0;
            }
            @media print {
              body {
                padding: 0;
              }
              .resident-card {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Automatically trigger print dialog after content loads
    printWindow.onload = function() {
      printWindow.print();
      printWindow.onafterprint = function() {
        printWindow.close();
      };
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/handover")}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Handover Sheet
        </Button>
        <span>/</span>
        <span className="text-foreground">All Handovers</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/dashboard/handover")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Handover History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of all handover reports
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Handovers</p>
                <p className="text-2xl font-bold text-blue-900">{handoverStats.total}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Day Shifts</p>
                <p className="text-2xl font-bold text-yellow-900">{handoverStats.day}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Sun className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Night Shifts</p>
                <p className="text-2xl font-bold text-indigo-900">{handoverStats.night}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Moon className="w-5 h-5 text-indigo-600" />
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
              <span>Filter Handovers</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={groupedHandovers.length === 0}
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
              value={selectedShift}
              onValueChange={(value) => {
                setSelectedShift(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
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

      {/* Handovers Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Handover Reports ({groupedHandovers.length} dates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedHandovers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No handover reports found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No handover reports recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Day Shift</TableHead>
                      <TableHead>Night Shift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHandovers.map((item: any) => (
                      <TableRow key={item.date}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(new Date(item.date), "dd MMM yyyy")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.day ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Sun className="w-4 h-4 text-amber-600" />
                                <span className="text-sm">Day Report</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewHandover(item.day)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No report</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.night ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Moon className="w-4 h-4 text-indigo-600" />
                                <span className="text-sm">Night Report</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewHandover(item.night)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No report</span>
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
                    Showing {startIndex + 1}-{Math.min(endIndex, groupedHandovers.length)} of {groupedHandovers.length} dates
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

      {/* View Handover Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Handover Report Details</DialogTitle>
            <DialogDescription>
              Complete handover report for {selectedHandover?.teamName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedHandover && (
              <div className="space-y-6">
                {/* Report Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Report Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{format(new Date(selectedHandover.date), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shift</p>
                      <Badge className={`${
                        selectedHandover.shift === "day"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-indigo-100 text-indigo-800"
                      } border-0`}>
                        {selectedHandover.shift === "day" ? "Day Shift" : "Night Shift"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Team</p>
                      <p className="font-medium">{selectedHandover.teamName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Residents</p>
                      <p className="font-medium">{selectedHandover.residentHandovers?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Resident Handovers */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Resident Handovers</h3>
                  <div className="space-y-4">
                    {selectedHandover.residentHandovers?.map((resident: any) => (
                      <div key={resident.residentId} className="border-b pb-4 last:border-0">
                        <div className="mb-3">
                          <h4 className="font-semibold text-base">{resident.residentName}</h4>
                          <p className="text-sm text-gray-500">
                            {resident.age} years old • Room {resident.roomNumber || "—"}
                          </p>
                        </div>

                        {/* Report Data */}
                        <div className="grid grid-cols-4 gap-6 mb-3">
                          <div>
                            <p className="text-sm text-gray-500">Food Intake</p>
                            <p className="font-medium">{resident.foodIntakeCount} meals</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Fluid Total</p>
                            <p className="font-medium">{resident.totalFluid} ml</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Incidents</p>
                            <p className="font-medium">{resident.incidentCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Hospital Transfer</p>
                            <p className="font-medium">{resident.hospitalTransferCount}</p>
                          </div>
                        </div>

                        {/* Comments */}
                        {resident.comments && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Comments</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{resident.comments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Record Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{selectedHandover.createdByName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Created</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{format(new Date(selectedHandover.createdAt), "PPP p")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            {selectedHandover && (
              <Button
                onClick={() => handleDownloadReport(selectedHandover)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}