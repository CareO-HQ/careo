"use client";

import React, { useState, useMemo } from "react";
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
  User,
  FileText,
  Filter,
  Download,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { residentService, Resident } from "@/lib/resident-service";
import { multidisciplinaryService, MultidisciplinaryNote } from "@/lib/multidisciplinary-service";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";


type MultidisciplinaryNotesDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function MultidisciplinaryNotesDocumentsPage({ params }: MultidisciplinaryNotesDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { profile } = useProfile();

  // State for data
  const [resident, setResident] = useState<Resident | null | undefined>(undefined);
  const [multidisciplinaryNotes, setMultidisciplinaryNotes] = useState<MultidisciplinaryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDayNotes, setSelectedDayNotes] = useState<MultidisciplinaryNote[]>([]);
  const [isDailyViewDialogOpen, setIsDailyViewDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      const [resData, notesData] = await Promise.all([
        residentService.getResidentById(id),
        multidisciplinaryService.getNotesByResidentId(id)
      ]);
      setResident(resData);
      setMultidisciplinaryNotes(notesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate resident details
  const fullName = useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return "Unknown Resident";
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident]);

  // Get unique years from notes for filter
  const availableYears = useMemo(() => {
    if (!multidisciplinaryNotes || multidisciplinaryNotes.length === 0) return [];
    const years = [...new Set(multidisciplinaryNotes.map(note =>
      new Date(note.noteDate).getFullYear()
    ))];
    return years.sort((a, b) => b - a);
  }, [multidisciplinaryNotes]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    if (!multidisciplinaryNotes) return [];

    let filtered = [...multidisciplinaryNotes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.teamMemberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.reasonForVisit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.outcome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.signature.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply month filter
    if (selectedMonth !== "all") {
      filtered = filtered.filter(note => {
        const noteMonth = new Date(note.noteDate).getMonth() + 1;
        return noteMonth === parseInt(selectedMonth);
      });
    }

    // Apply year filter
    if (selectedYear !== "all") {
      filtered = filtered.filter(note => {
        const noteYear = new Date(note.noteDate).getFullYear();
        return noteYear === parseInt(selectedYear);
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.noteDate).getTime();
      const dateB = new Date(b.noteDate).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [multidisciplinaryNotes, searchQuery, selectedMonth, selectedYear, sortOrder]);

  // Group filtered notes by day
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: MultidisciplinaryNote[] } = {};
    filteredNotes.forEach(note => {
      if (!groups[note.noteDate]) {
        groups[note.noteDate] = [];
      }
      groups[note.noteDate].push(note);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredNotes]);

  // Pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = filteredNotes.slice(startIndex, endIndex);

  // Group paginated notes for display
  const paginatedGroupedNotes = useMemo(() => {
    const groups: { [key: string]: MultidisciplinaryNote[] } = {};
    paginatedNotes.forEach(note => {
      if (!groups[note.noteDate]) {
        groups[note.noteDate] = [];
      }
      groups[note.noteDate].push(note);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginatedNotes]);

  // Handlers
  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };

  const handleViewDay = (day: string, notes: MultidisciplinaryNote[]) => {
    setSelectedDay(day);
    setSelectedDayNotes(notes);
    setIsDailyViewDialogOpen(true);
  };

  const handleDownloadDailyPDF = async (day: string, notes: MultidisciplinaryNote[]) => {
    if (!resident) return;
    setIsDownloading(true);
    try {
      const response = await fetch('/api/pdf/multidisciplinary-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resident: {
            first_name: resident.firstName,
            last_name: resident.lastName,
            dob: resident.dateOfBirth,
            room: resident.roomNumber,
            nhs: resident.nhsHealthNumber,
          },
          dayData: {
            date: day,
            notes: notes.map(n => ({
              team_member_name: n.teamMemberName,
              note_time: n.noteTime,
              reason_for_visit: n.reasonForVisit,
              outcome: n.outcome,
              relative_informed: n.relativeInformed,
              relative_informed_details: n.relativeInformedDetails,
              signature: n.signature
            }))
          },
          orgLogoUrl: profile?.organization_logo_url,
          careHomeName: profile?.care_home_name || profile?.organization_name,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mdt-report-${resident.firstName}-${resident.lastName}-${day}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("MDT report downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download MDT report");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExport = () => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    // Create CSV content
    const headers = ["Date", "Time", "Team Member", "Reason for Visit", "Outcome", "Relative Informed", "Signature"];
    const rows = filteredNotes.map(note => [
      note.noteDate,
      note.noteTime,
      note.teamMemberName,
      note.reasonForVisit,
      note.outcome,
      note.relativeInformed ? 'Yes' : 'No',
      note.signature
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
    a.download = `multidisciplinary-notes-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading || resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading multidisciplinary notes...</p>
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
          onClick={() => router.push(`/dashboard/residents/${id}/multidisciplinary-note`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          Multidisciplinary Notes
        </Button>
        <span>/</span>
        <span className="text-foreground">All Notes</span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/multidisciplinary-note`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">All Multidisciplinary Notes</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of multidisciplinary care notes for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">Total Notes</p>
                <p className="text-2xl font-bold text-indigo-900">{multidisciplinaryNotes.length}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {multidisciplinaryNotes.filter(note => {
                    const noteDate = new Date(note.noteDate);
                    const now = new Date();
                    return noteDate.getMonth() === now.getMonth() &&
                      noteDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Relatives Informed</p>
                <p className="text-2xl font-bold text-purple-900">
                  {multidisciplinaryNotes.filter(note => note.relativeInformed).length}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Unique Members</p>
                <p className="text-2xl font-bold text-orange-900">
                  {new Set(multidisciplinaryNotes.map(note => note.teamMemberName)).size}
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <User className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-lg">
              <Filter className="w-5 h-5 text-gray-500" />
              <span>Filter Notes</span>
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
                  placeholder="Search by team member, reason, outcome, or signature..."
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

      {/* Notes Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg">
            Multidisciplinary Notes ({filteredNotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No notes found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No multidisciplinary notes recorded yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/75">
                    <TableRow>
                      <TableHead className="w-[120px] text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</TableHead>
                      <TableHead className="w-[180px] text-xs font-bold text-gray-500 uppercase tracking-wider">Team Member</TableHead>
                      <TableHead className="min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Visit</TableHead>
                      <TableHead className="min-w-[200px] text-xs font-bold text-gray-500 uppercase tracking-wider">Outcome & Recommendations</TableHead>
                      <TableHead className="w-[140px] text-xs font-bold text-gray-500 uppercase tracking-wider">Relative Informed</TableHead>
                      <TableHead className="w-[120px] text-xs font-bold text-gray-500 uppercase tracking-wider">Signature</TableHead>
                      <TableHead className="w-[100px] text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedNotes.map((note) => {
                      const noteProfession = note.profession || "Other";
                      return (
                        <TableRow key={note.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="align-top py-3.5">
                            <div className="font-semibold text-gray-900 text-xs">
                              {format(new Date(note.noteDate), "dd/MM/yyyy")}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {note.noteTime || "--:--"}
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-3.5">
                            <div className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              {note.teamMemberName}
                            </div>
                            {noteProfession && (
                              <Badge className="text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-0 h-4 mt-1 px-1.5 py-0">
                                {noteProfession}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="align-top py-3.5 max-w-[250px]">
                            <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.reasonForVisit}>
                              {note.reasonForVisit}
                            </p>
                          </TableCell>
                          <TableCell className="align-top py-3.5 max-w-[250px]">
                            <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap leading-relaxed" title={note.outcome}>
                              {note.outcome}
                            </p>
                          </TableCell>
                          <TableCell className="align-top py-3.5">
                            <div className="flex flex-col gap-1.5">
                              <Badge variant="outline" className={`w-fit text-[10px] py-0 px-1.5 h-4 ${note.relativeInformed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {note.relativeInformed ? 'Informed' : 'Not Informed'}
                              </Badge>
                              {note.relativeInformedDetails && (
                                <span className="text-[10px] text-gray-400 line-clamp-1 max-w-[120px]" title={note.relativeInformedDetails}>
                                  {note.relativeInformedDetails}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-3.5">
                            <div className="text-xs text-gray-600 font-medium italic flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                              {note.signature}
                            </div>
                          </TableCell>
                          <TableCell className="align-top py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewNote(note)}
                                className="h-7 w-7 p-0 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                                title="View Detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadDailyPDF(note.noteDate, [note])}
                                disabled={isDownloading}
                                className="h-7 w-7 p-0 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNum =>
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        )
                        .map((pageNum, idx, arr) => (
                          <React.Fragment key={pageNum}>
                            {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span className="text-gray-400 text-xs">...</span>}
                            <Button
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0 text-xs"
                            >
                              {pageNum}
                            </Button>
                          </React.Fragment>
                        ))
                      }
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

      {/* View Note Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-900">Multidisciplinary Note Details</DialogTitle>
            <DialogDescription>
              Complete multidisciplinary note details for {fullName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {selectedNote && (
              <div className="space-y-6">
                {/* Note Overview */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <h3 className="font-semibold text-indigo-900 mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Visit Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Date</p>
                      <p className="font-medium text-gray-900">{format(new Date(selectedNote.noteDate), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Time</p>
                      <p className="font-medium text-gray-900">{selectedNote.noteTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Team Member</p>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-indigo-600" />
                        <p className="font-medium text-gray-900">{selectedNote.teamMemberName}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Relative Informed</p>
                      <Badge className={`${selectedNote.relativeInformed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        } border-0`}>
                        {selectedNote.relativeInformed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Visit Details */}
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <ClipboardList className="w-4 h-4 mr-2 text-indigo-600" />
                      Reason for Visit
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedNote.reasonForVisit}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <UserCheck className="w-4 h-4 mr-2 text-indigo-600" />
                      Outcome
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedNote.outcome}
                    </p>
                  </div>
                  {selectedNote.relativeInformedDetails && (
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-indigo-600" />
                        Relative Contact Details
                      </h3>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedNote.relativeInformedDetails}
                      </p>
                    </div>
                  )}
                </div>

                {/* Record Information */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                    Record Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Signed By</p>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-3 h-3 text-gray-400" />
                        <p className="font-medium text-gray-900">{selectedNote.signature}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Date Created</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="font-medium text-gray-900">{format(new Date(selectedNote.createdAt || selectedNote.noteDate), "PPP")}</p>
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

      {/* Daily View Dialog */}
      <Dialog open={isDailyViewDialogOpen} onOpenChange={setIsDailyViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-indigo-900">MDT Visits - {selectedDay ? format(new Date(selectedDay), "EEEE, MMMM d, yyyy") : ''}</DialogTitle>
            <DialogDescription>
              Summary of all multidisciplinary team visits for this day.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-4 py-4">
              {selectedDayNotes.map((note, index) => (
                <Card key={note.id} className="border shadow-sm overflow-hidden">
                  <div className="bg-indigo-50/50 px-4 py-2 border-b flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-indigo-700 font-semibold">
                      <Users className="w-4 h-4" />
                      <span>Visit {index + 1}: {note.teamMemberName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{note.noteTime}</span>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Reason for Visit</h4>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                          {note.reasonForVisit}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Outcome & Recommendations</h4>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                          {note.outcome}
                        </div>
                      </div>
                    </div>
                    {note.relativeInformedDetails && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Relative Contact Details</h4>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap">
                          {note.relativeInformedDetails}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Signed: {note.signature}</span>
                        </span>
                      </div>
                      <Badge variant="outline" className={`${note.relativeInformed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        Relative {note.relativeInformed ? 'Informed' : 'Not Informed'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleDownloadDailyPDF(selectedDay, selectedDayNotes)}
              disabled={isDownloading}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => setIsDailyViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
