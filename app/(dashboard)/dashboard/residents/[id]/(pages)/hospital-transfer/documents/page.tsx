"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Search,
  Calendar,
  Hospital,
  FileText,
  Pill,
  Filter,
  Download,
  Eye,
  Ambulance,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { ViewTransferLogDialog } from "../view-transfer-log-dialog";

type TransferHistoryPageProps = {
  params: Promise<{ id: string }>;
};

export default function TransferHistoryPage({ params }: TransferHistoryPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch transfer logs
  const transferLogs = useQuery(api.hospitalTransferLogs.getByResidentId, { residentId });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from logs for filter
  const availableYears = useMemo(() => {
    if (!transferLogs || transferLogs.length === 0) return [];
    const years = [...new Set(transferLogs.map(log =>
      new Date(log.date).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [transferLogs]);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    if (!transferLogs) return [];

    let filtered = [...transferLogs];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.outcome && log.outcome.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(log => {
        const logMonth = new Date(log.date).getMonth() + 1;
        return logMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(log => {
        const logYear = new Date(log.date).getFullYear();
        return logYear === parseInt(selectedYear);
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [transferLogs, searchQuery, selectedMonth, selectedYear, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Handlers
  const handleViewLog = (log: any) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Hospital", "Reason", "Outcome", "Files Changed", "Medications Changed", "Follow Up"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.date), "dd/MM/yyyy"),
      log.hospitalName,
      log.reason,
      log.outcome || "N/A",
      [
        log.filesChanged?.carePlan && "Care Plan",
        log.filesChanged?.riskAssessment && "Risk Assessment",
        log.filesChanged?.other
      ].filter(Boolean).join(", ") || "None",
      [
        log.medicationChanges?.medicationsAdded && "Added",
        log.medicationChanges?.medicationsRemoved && "Removed",
        log.medicationChanges?.medicationsModified && "Modified"
      ].filter(Boolean).join(", ") || "None",
      log.followUp || "N/A"
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
    a.download = `transfer-history-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (!resident || !transferLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading transfer history...</p>
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
          onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Hospital Transfer
        </Button>
        <span>/</span>
        <span className="text-foreground">Transfer History</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Transfer History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of hospital transfers for {fullName}
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
                <p className="text-sm font-medium text-blue-700">Total Transfers</p>
                <p className="text-2xl font-bold text-blue-900">{transferLogs.length}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Ambulance className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {transferLogs.filter(log => {
                    const logDate = new Date(log.date);
                    const now = new Date();
                    return logDate.getMonth() === now.getMonth() &&
                           logDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
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
                <p className="text-sm font-medium text-purple-700">With Med Changes</p>
                <p className="text-2xl font-bold text-purple-900">
                  {transferLogs.filter(log =>
                    log.medicationChanges?.medicationsAdded ||
                    log.medicationChanges?.medicationsRemoved ||
                    log.medicationChanges?.medicationsModified
                  ).length}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Pill className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Files Updated</p>
                <p className="text-2xl font-bold text-orange-900">
                  {transferLogs.filter(log =>
                    log.filesChanged?.carePlan ||
                    log.filesChanged?.riskAssessment ||
                    log.filesChanged?.other
                  ).length}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-orange-600" />
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
              <span>Filter Transfer Logs</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
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
                  placeholder="Search by hospital, reason, or outcome..."
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

      {/* Transfer Logs Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Transfer Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Ambulance className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No transfer logs found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No transfers recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Files Changed</TableHead>
                      <TableHead>Medications</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="font-medium">
                          {format(new Date(log.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Hospital className="w-4 h-4 text-gray-400" />
                            <span>{log.hospitalName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate">{log.reason}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.filesChanged?.carePlan && (
                              <Badge variant="outline" className="text-xs bg-blue-50">
                                Care Plan
                              </Badge>
                            )}
                            {log.filesChanged?.riskAssessment && (
                              <Badge variant="outline" className="text-xs bg-purple-50">
                                Risk
                              </Badge>
                            )}
                            {log.filesChanged?.other && (
                              <Badge variant="outline" className="text-xs bg-gray-50">
                                Other
                              </Badge>
                            )}
                            {!log.filesChanged?.carePlan && !log.filesChanged?.riskAssessment && !log.filesChanged?.other && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.medicationChanges?.medicationsAdded && (
                              <Badge variant="outline" className="text-xs bg-green-50">
                                Added
                              </Badge>
                            )}
                            {log.medicationChanges?.medicationsRemoved && (
                              <Badge variant="outline" className="text-xs bg-red-50">
                                Removed
                              </Badge>
                            )}
                            {log.medicationChanges?.medicationsModified && (
                              <Badge variant="outline" className="text-xs bg-orange-50">
                                Modified
                              </Badge>
                            )}
                            {!log.medicationChanges?.medicationsAdded &&
                             !log.medicationChanges?.medicationsRemoved &&
                             !log.medicationChanges?.medicationsModified && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.outcome ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              {log.outcome}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
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

      {/* View Dialog */}
      <ViewTransferLogDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        transferLog={selectedLog}
        residentName={fullName}
        currentUser={null}
      />
    </div>
  );
}