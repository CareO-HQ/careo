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
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Handover Report Details</DialogTitle>
            <DialogDescription>
              Complete handover report with all resident information
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            {selectedHandover && (
              <div className="space-y-6">
                {/* Report Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Report Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="font-medium">{format(new Date(selectedHandover.date), "PPP")}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shift</p>
                      <Badge
                        className={`mt-1 text-xs border-0 flex items-center w-fit ${
                          selectedHandover.shift === "day"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {selectedHandover.shift === "day" ? (
                          <>
                            <Sun className="w-3 h-3 mr-1" />
                            Day Shift
                          </>
                        ) : (
                          <>
                            <Moon className="w-3 h-3 mr-1" />
                            Night Shift
                          </>
                        )}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Team</p>
                      <p className="font-medium mt-1">{selectedHandover.teamName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Residents</p>
                      <p className="font-medium mt-1">{selectedHandover.residentHandovers?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Resident Handovers */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-3">Resident Handovers</h3>
                  <div className="space-y-4">
                    {selectedHandover.residentHandovers?.map((resident: any, index: number) => (
                      <div key={resident.residentId} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-base">{resident.residentName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {resident.age} years old • Room {resident.roomNumber || "—"}
                            </p>
                          </div>
                        </div>

                        {/* Report Data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="bg-white p-3 rounded-md border">
                            <p className="text-xs text-gray-500 mb-1">Food Intake</p>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              {resident.foodIntakeCount} meals
                            </Badge>
                          </div>
                          <div className="bg-white p-3 rounded-md border">
                            <p className="text-xs text-gray-500 mb-1">Fluid Total</p>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              {resident.totalFluid} ml
                            </Badge>
                          </div>
                          <div className="bg-white p-3 rounded-md border">
                            <p className="text-xs text-gray-500 mb-1">Incidents</p>
                            <Badge
                              variant="outline"
                              className={
                                resident.incidentCount > 0
                                  ? "bg-red-50 text-red-700 border-red-300"
                                  : "bg-green-50 text-green-700 border-green-300"
                              }
                            >
                              {resident.incidentCount}
                            </Badge>
                          </div>
                          <div className="bg-white p-3 rounded-md border">
                            <p className="text-xs text-gray-500 mb-1">Hospital Transfer</p>
                            <Badge
                              variant="outline"
                              className={
                                resident.hospitalTransferCount > 0
                                  ? "bg-purple-50 text-purple-700 border-purple-300"
                                  : "bg-green-50 text-green-700 border-green-300"
                              }
                            >
                              {resident.hospitalTransferCount}
                            </Badge>
                          </div>
                        </div>

                        {/* Comments */}
                        {resident.comments && (
                          <div className="bg-white p-3 rounded-md border">
                            <p className="text-xs text-gray-500 mb-1">Comments</p>
                            <p className="text-sm whitespace-pre-wrap">{resident.comments}</p>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}