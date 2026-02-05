"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  Stethoscope,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

type ProgressNotesDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProgressNotesDocumentsPage({ params }: ProgressNotesDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const residentId = id;

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

  // State for data
  const [resident, setResident] = useState<any>(null);
  const [progressNotes, setProgressNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch resident data
  useEffect(() => {
    async function fetchResident() {
      try {
        const response = await fetch(`/api/residents/${id}`);
        if (response.ok) {
          const data = await response.json();
          setResident(data);
        } else {
          setResident({ id, firstName: "Resident", lastName: "" });
        }
      } catch (error) {
        console.error("Error fetching resident:", error);
        setResident({ id, firstName: "Resident", lastName: "" });
      }
    }
    if (id) {
      fetchResident();
    }
  }, [id]);

  // Fetch progress notes
  useEffect(() => {
    async function fetchProgressNotes() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/progress-notes/all?residentId=${residentId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching progress notes:", response.status, errorText);
          toast.error("Failed to load progress notes");
          return;
        }
        const data = await response.json();
        console.log("Fetched progress notes:", data.length);
        setProgressNotes(data || []);
      } catch (error) {
        console.error("Error fetching progress notes:", error);
        toast.error("Failed to load progress notes");
      } finally {
        setIsLoading(false);
      }
    }
    if (residentId) {
      fetchProgressNotes();
    }
  }, [residentId]);

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
        note.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.authorName?.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Group notes by day
  const notesByDay = useMemo(() => {
    if (!filteredNotes || filteredNotes.length === 0) return [];

    const grouped: Record<string, any[]> = {};
    
    filteredNotes.forEach(note => {
      const dateKey = format(new Date(note.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(note);
    });

    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([date, notes]) => ({
        date,
        notes: notes.sort((a, b) => {
          // Sort notes within a day by time (descending by default, or ascending if sortOrder is asc)
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          // If times are equal, sort by creation time
          if (timeA === timeB) {
            const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sortOrder === "desc" ? createdB - createdA : createdA - createdB;
          }
          return sortOrder === "desc" ? timeB.localeCompare(timeA) : timeA.localeCompare(timeB);
        })
      }))
      .sort((a, b) => {
        // Sort days by date
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
  }, [filteredNotes, sortOrder]);

  // Download notes for a specific day as PDF
  const handleDownloadDay = async (dayNotes: any[], date: string) => {
    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPos = margin;
      
      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", 'bold');
      doc.text('Progress Notes', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", 'normal');
      doc.text(`Resident: ${fullName}`, margin, yPos);
      yPos += 7;
      doc.text(`Date: ${format(new Date(date), "EEEE, dd MMMM yyyy")}`, margin, yPos);
      yPos += 7;
      doc.text(`Total Notes: ${dayNotes.length}`, margin, yPos);
      yPos += 10;
      
      // Draw line
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // Notes
      doc.setFontSize(10);
      dayNotes.forEach((note, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        
        // Note header
        doc.setFont("helvetica", 'bold');
        doc.setFontSize(11);
        doc.text(`Note ${index + 1}`, margin, yPos);
        yPos += 7;
        
        // Note details
        doc.setFont("helvetica", 'normal');
        doc.setFontSize(10);
        const details = [
          `Time: ${note.time || "00:00"}`,
          `Type: ${note.type ? note.type.charAt(0).toUpperCase() + note.type.slice(1) : "Note"}`,
          `Author: ${note.authorName || "Unknown"}`,
        ];
        
        details.forEach(detail => {
          doc.text(detail, margin + 5, yPos);
          yPos += 6;
        });
        
        yPos += 3;
        
        // Note content
        doc.setFont("helvetica", 'bold');
        doc.text('Content:', margin + 5, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", 'normal');
        const noteText = note.note || "No note content";
        const splitText = doc.splitTextToSize(noteText, maxWidth - 10);
        
        splitText.forEach((line: string) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin + 5, yPos);
          yPos += 6;
        });
        
        yPos += 5;
        
        // Draw separator line
        if (index < dayNotes.length - 1) {
          doc.setLineWidth(0.2);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
        }
      });
      
      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages} - Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Save PDF
      doc.save(`progress-notes-${fullName.replace(/\s+/g, "-")}-${date}.pdf`);
      toast.success("Progress notes downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // View notes for a specific day
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDayViewDialogOpen, setIsDayViewDialogOpen] = useState(false);
  
  const handleViewDay = (date: string) => {
    setSelectedDay(date);
    setIsDayViewDialogOpen(true);
  };

  // Pagination for days
  const totalPages = Math.ceil(notesByDay.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDays = notesByDay.slice(startIndex, endIndex);

  // Handlers
  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };

  const handleExport = async () => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPos = margin;
      
      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", 'bold');
      doc.text('Progress Notes - Complete History', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", 'normal');
      doc.text(`Resident: ${fullName}`, margin, yPos);
      yPos += 7;
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, margin, yPos);
      yPos += 7;
      doc.text(`Total Days: ${notesByDay.length} | Total Notes: ${filteredNotes.length}`, margin, yPos);
      yPos += 10;
      
      // Process each day
      notesByDay.forEach((dayGroup, dayIndex) => {
        // Check if we need a new page
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        }
        
        // Day header
        doc.setFontSize(14);
        doc.setFont("helvetica", 'bold');
        doc.text(format(new Date(dayGroup.date), "EEEE, dd MMMM yyyy"), margin, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", 'normal');
        doc.text(`${dayGroup.notes.length} note${dayGroup.notes.length !== 1 ? 's' : ''}`, margin, yPos);
        yPos += 5;
        
        // Draw line
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        // Notes for this day
        dayGroup.notes.forEach((note, noteIndex) => {
          // Check if we need a new page
          if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margin;
          }
          
          // Note header
          doc.setFont("helvetica", 'bold');
          doc.setFontSize(11);
          doc.text(`Note ${noteIndex + 1}`, margin, yPos);
          yPos += 7;
          
          // Note details
          doc.setFont("helvetica", 'normal');
          doc.setFontSize(10);
          const details = [
            `Time: ${note.time || "00:00"}`,
            `Type: ${note.type ? note.type.charAt(0).toUpperCase() + note.type.slice(1) : "Note"}`,
            `Author: ${note.authorName || "Unknown"}`,
          ];
          
          details.forEach(detail => {
            doc.text(detail, margin + 5, yPos);
            yPos += 6;
          });
          
          yPos += 3;
          
          // Note content
          doc.setFont("helvetica", 'bold');
          doc.text('Content:', margin + 5, yPos);
          yPos += 6;
          
          doc.setFont("helvetica", 'normal');
          const noteText = note.note || "No note content";
          const splitText = doc.splitTextToSize(noteText, maxWidth - 10);
          
          splitText.forEach((line: string) => {
            if (yPos > pageHeight - 30) {
              doc.addPage();
              yPos = margin;
            }
            doc.text(line, margin + 5, yPos);
            yPos += 6;
          });
          
          yPos += 5;
          
          // Draw separator line
          if (noteIndex < dayGroup.notes.length - 1) {
            doc.setLineWidth(0.2);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 5;
          }
        });
        
        // Space between days
        if (dayIndex < notesByDay.length - 1) {
          yPos += 10;
          doc.setLineWidth(0.5);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 10;
        }
      });
      
      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages} - Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Save PDF
      doc.save(`progress-notes-${fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Progress notes exported as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Loading state
  if (isLoading || !resident) {
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

      {/* Progress Notes Grouped by Day */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle>
            Progress Notes by Day ({notesByDay.length} days, {filteredNotes.length} total notes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notesByDay.length === 0 ? (
            <div className="text-center py-12">
              <NotebookPen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No progress notes found</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No progress notes recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedDays.map((dayGroup) => (
                  <Card key={dayGroup.date} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {format(new Date(dayGroup.date), "EEEE, dd MMMM yyyy")}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {dayGroup.notes.length} note{dayGroup.notes.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDay(dayGroup.date)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDay(dayGroup.notes, dayGroup.date)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>First note: {dayGroup.notes[0]?.time || "00:00"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Last note: {dayGroup.notes[dayGroup.notes.length - 1]?.time || "00:00"}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, notesByDay.length)} of {notesByDay.length} days
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

      {/* Day View Dialog */}
      <Dialog open={isDayViewDialogOpen} onOpenChange={setIsDayViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Progress Notes - {selectedDay && format(new Date(selectedDay), "EEEE, dd MMMM yyyy")}
            </DialogTitle>
            <DialogDescription>
              All progress notes for this day
            </DialogDescription>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const dayNotes = notesByDay.find(d => d.date === selectedDay)?.notes || [];
                    handleDownloadDay(dayNotes, selectedDay);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              </div>
              <div className="space-y-3">
                {notesByDay.find(d => d.date === selectedDay)?.notes.map((note) => (
                  <Card key={note.id || note._id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`text-xs ${
                              note.type === "incident" ? "bg-red-100 text-red-800 border-red-200" :
                              note.type === "medical" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              note.type === "behavioral" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                              note.type === "daily" ? "bg-green-100 text-green-800 border-green-200" :
                              note.type === "other" ? "bg-gray-100 text-gray-800 border-gray-200" :
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {note.type ? note.type.charAt(0).toUpperCase() + note.type.slice(1) : "Note"}
                          </Badge>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{note.time || "00:00"}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{note.authorName || "Unknown"}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md mb-2">
                        <p className="text-sm whitespace-pre-wrap break-words">{note.note || "No note content"}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                        <div>
                          {note.createdAt && (
                            <span>Created: {format(new Date(note.createdAt), "PPp")}</span>
                          )}
                        </div>
                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                          <div>
                            <span>Updated: {format(new Date(note.updatedAt), "PPp")}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsDayViewDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                        className={`text-xs ${
                          selectedNote.type === "incident" ? "bg-red-100 text-red-800 border-red-200" :
                          selectedNote.type === "medical" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          selectedNote.type === "behavioral" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                          selectedNote.type === "daily" ? "bg-green-100 text-green-800 border-green-200" :
                          selectedNote.type === "other" ? "bg-gray-100 text-gray-800 border-gray-200" :
                          "bg-gray-100 text-gray-800 border-gray-200"
                        }`}
                      >
                        {selectedNote.type ? selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1) : "Note"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {selectedNote.time}
                  </span>
                </div>

                <div className="mb-3 p-3 bg-gray-50 rounded-md border">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {selectedNote.note || "No note content"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md border">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Date</span>
                    <p className="text-sm font-medium">{format(new Date(selectedNote.date), "EEEE, dd MMMM yyyy")}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Time</span>
                    <p className="text-sm font-medium">{selectedNote.time || "00:00"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Author</span>
                    <p className="text-sm font-medium">{selectedNote.authorName || "Unknown"}</p>
                  </div>
                  {selectedNote.createdAt && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Created</span>
                      <p className="text-sm">{format(new Date(selectedNote.createdAt), "PPp")}</p>
                    </div>
                  )}
                  {selectedNote.updatedAt && selectedNote.updatedAt !== selectedNote.createdAt && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground block mb-1">Last Updated</span>
                      <p className="text-sm">{format(new Date(selectedNote.updatedAt), "PPp")}</p>
                    </div>
                  )}
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