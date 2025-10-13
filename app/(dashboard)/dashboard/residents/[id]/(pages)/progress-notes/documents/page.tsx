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
  User,
  FileText,
  Filter,
  Download,
  Eye,
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type ProgressNotesDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProgressNotesDocumentsPage({ params }: ProgressNotesDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id as Id<"residents">;

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch resident data
  const resident = useQuery(api.residents.getById, { residentId });

  // Fetch progress notes
  const progressNotes = useQuery(api.progressNotes.getByResidentId, { residentId });

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from notes for filter
  const availableYears = useMemo(() => {
    if (!progressNotes || progressNotes.length === 0) return [];
    const years = [...new Set(progressNotes.map(note =>
      new Date(note.date).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [progressNotes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    if (!progressNotes) return [];

    let filtered = [...progressNotes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(note => {
        const noteMonth = new Date(note.date).getMonth() + 1;
        return noteMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(note => {
        const noteYear = new Date(note.date).getFullYear();
        return noteYear === parseInt(selectedYear);
      });
    }

    // Apply type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(note => note.type === selectedType);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [progressNotes, searchQuery, selectedMonth, selectedYear, selectedType, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = filteredNotes.slice(startIndex, endIndex);

  // Handlers
  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };

  const handleExport = () => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Type", "Author", "Note Content"];
    const rows = filteredNotes.map(note => [
      note.date,
      note.time,
      note.type,
      note.authorName,
      note.note.replace(/\n/g, " ")
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
    a.download = `progress-notes-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (!resident || !progressNotes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading progress notes...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const noteStats = {
    total: progressNotes.length,
    daily: progressNotes.filter(n => n.type === 'daily').length,
    medical: progressNotes.filter(n => n.type === 'medical').length,
    incident: progressNotes.filter(n => n.type === 'incident').length,
    behavioral: progressNotes.filter(n => n.type === 'behavioral').length,
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
          onClick={() => router.push(`/dashboard/residents/${id}/progress-notes`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Progress Notes
        </Button>
        <span>/</span>
        <span className="text-foreground">All Notes</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/progress-notes`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <NotebookPen className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Progress Notes History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of progress notes for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Daily Notes</p>
                <p className="text-2xl font-bold text-green-900">{noteStats.daily}</p>
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
                <p className="text-sm font-medium text-blue-700">Medical Notes</p>
                <p className="text-2xl font-bold text-blue-900">{noteStats.medical}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Incident Notes</p>
                <p className="text-2xl font-bold text-red-900">{noteStats.incident}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Behavioral Notes</p>
                <p className="text-2xl font-bold text-orange-900">{noteStats.behavioral}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <User className="w-5 h-5 text-orange-600" />
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
              <span>Filter Progress Notes</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredNotes.length === 0}
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
                  placeholder="Search by note content, type, or author..."
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
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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

      {/* Progress Notes Table */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Progress Notes ({filteredNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <NotebookPen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No progress notes found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No progress notes recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Note Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedNotes.map((note) => (
                      <TableRow key={note._id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{format(new Date(note.date), "dd MMM yyyy")}</span>
                            <span className="text-xs text-gray-500">{note.time}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs border-0 ${
                              note.type === "incident" ? "bg-red-100 text-red-800" :
                              note.type === "medical" ? "bg-blue-100 text-blue-800" :
                              note.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                              note.type === "daily" ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{note.authorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{note.note}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewNote(note)}
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
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredNotes.length)} of {filteredNotes.length} notes
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

      {/* View Note Dialog - Matching Food & Fluid style */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Progress Note - {selectedNote && format(new Date(selectedNote.date), "PPP")}</DialogTitle>
            <DialogDescription>
              Detailed view of this progress note entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedNote ? (
              <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">
                        {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)} Note
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs border-0 ${
                          selectedNote.type === "incident" ? "bg-red-100 text-red-800" :
                          selectedNote.type === "medical" ? "bg-blue-100 text-blue-800" :
                          selectedNote.type === "behavioral" ? "bg-yellow-100 text-yellow-800" :
                          selectedNote.type === "daily" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {selectedNote.time}
                  </span>
                </div>

                <div className="mb-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedNote.note}</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium">Date:</span> {format(new Date(selectedNote.date), "MMM d, yyyy")}
                  </span>
                  <span>
                    <span className="font-medium">Time:</span> {selectedNote.time}
                  </span>
                  <span>
                    <span className="font-medium">Author:</span> {selectedNote.authorName}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  Recorded by: {selectedNote.authorName} on {format(new Date(selectedNote.createdAt), "PPP")}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">No note selected</p>
            )}
          </div>
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