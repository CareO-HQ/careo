"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Calendar,
  FileText,
  Download,
  Eye,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  User,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clinicalService } from "@/lib/clinical-service";
import { hospitalTransferService } from "@/lib/hospital-transfer-service";
import { toast } from "sonner";

type ClinicalDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

// Define interface for grouped notes
interface GroupedNotes {
  date: string;
  notes: any[];
}

export default function ClinicalDocumentsPage({ params }: ClinicalDocumentsPageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  // State
  const [resident, setResident] = useState<any | null>(undefined);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Dialog state
  const [viewDialogDate, setViewDialogDate] = useState<string | null>(null);
  const [viewDialogNotes, setViewDialogNotes] = useState<any[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch Resident
      const residentData = await hospitalTransferService.getResidentById(id);
      setResident(residentData || null);

      // Fetch Clinical Notes (fetching a larger limit for history)
      const fetchedNotes = await clinicalService.getClinicalNotes(id, 200);
      setNotes(fetchedNotes || []);

    } catch (error) {
      console.error("Error loading clinical documents:", error);
      toast.error("Failed to load clinical documents");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Group notes by date
  const groupedNotes = useMemo(() => {
    if (!notes) return [];

    // Filter by search, day, month, and year
    const filtered = notes.filter(note => {
      const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.staffName && note.staffName.toLowerCase().includes(searchQuery.toLowerCase()));

      const noteDateObj = new Date(note.noteDate);
      const matchesDay = selectedDay === "all" || noteDateObj.getDate().toString() === selectedDay;
      const matchesMonth = selectedMonth === "all" || (noteDateObj.getMonth() + 1).toString() === selectedMonth;
      const matchesYear = selectedYear === "all" || noteDateObj.getFullYear().toString() === selectedYear;

      return matchesSearch && matchesDay && matchesMonth && matchesYear;
    });

    // Group by date
    const groups: Record<string, any[]> = {};

    filtered.forEach(note => {
      const date = note.noteDate; // YYYY-MM-DD
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(note);
    });

    // Convert to array and sort by date descending
    return Object.entries(groups)
      .map(([date, notes]) => ({ date, notes }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notes, searchQuery, selectedDay, selectedMonth, selectedYear]);

  // Generate filter options
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const yearList: string[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      yearList.push(y.toString());
    }
    return yearList;
  }, []);

  // Handle PDF Download
  const handleDownloadPDF = (date: string, dayNotes: any[]) => {
    if (!resident || !dayNotes.length) return;

    // Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // Helper for right aligned text
    const rightText = (text: string, y: number) => {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - margin - textWidth, y);
    };

    // --- Header ---
    doc.setFillColor(37, 99, 235); // CareO Blue (approx)
    doc.rect(0, 0, pageWidth, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CareO", margin, 13);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    rightText("Clinical Daily Record", 13);

    // --- Resident Details Block ---
    const formattedDate = format(new Date(date), "EEEE, do MMMM yyyy");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Left Column
    let yPos = 35;
    const lineHeight = 6;

    doc.setFont("helvetica", "bold");
    doc.text("RESIDENT DETAILS", margin, yPos);
    yPos += lineHeight + 2;

    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${resident.firstName} ${resident.lastName}`, margin, yPos);
    yPos += lineHeight;

    if (resident.dateOfBirth) {
      doc.text(`DOB: ${format(new Date(resident.dateOfBirth), "dd/MM/yyyy")}`, margin, yPos);
      yPos += lineHeight;
    }

    if (resident.nhsHealthNumber) {
      doc.text(`NHS Number: ${resident.nhsHealthNumber}`, margin, yPos);
      yPos += lineHeight;
    }

    // Right Column (Date Info)
    yPos = 35;
    doc.setFont("helvetica", "bold");
    rightText("RECORD DETAILS", yPos);
    yPos += lineHeight + 2;

    doc.setFont("helvetica", "normal");
    rightText(`Date: ${formattedDate}`, yPos);
    yPos += lineHeight;

    rightText(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, yPos);

    // Line separator
    yPos += 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    // --- Table Data ---
    const tableData = dayNotes.map(note => [
      note.noteTime || "N/A",
      note.staffName || "Unknown Staff",
      note.content
    ]);

    // --- AutoTable ---
    autoTable(doc, {
      startY: yPos + 10,
      head: [['Time', 'Staff Member', 'Clinical Entry']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [243, 244, 246], // Light gray header
        textColor: [17, 24, 39], // Dark gray text
        fontStyle: 'bold',
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      },
      styles: {
        fontSize: 10,
        textColor: [55, 65, 81],
        cellPadding: 4,
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' }, // Time
        1: { cellWidth: 45 }, // Staff
        2: { cellWidth: 'auto' } // Note
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `CONFIDENTIAL RECORD - Page ${data.pageNumber}`,
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
    });

    // Save
    doc.save(`Clinical_Record_${resident.firstName}_${resident.lastName}_${date}.pdf`);
    toast.success(`PDF downloaded for ${formattedDate}`);
  };

  const handleViewDay = (date: string, dayNotes: any[]) => {
    setViewDialogDate(date);
    setViewDialogNotes(dayNotes);
    setIsViewDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading clinical records...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return <div>Resident not found</div>;
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/dashboard/residents/${id}/clinical`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Clinical Records History</h1>
            <p className="text-muted-foreground text-sm">
              Complete history of clinical notes for {fullName}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 md:col-span-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Day:</span>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {days.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Month:</span>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">Year:</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDay("all");
                  setSelectedMonth("all");
                  setSelectedYear("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {groupedNotes.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[250px]">Date</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="w-[150px] text-center text-xs uppercase tracking-wider">Entries</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedNotes.map(({ date, notes }) => (
                    <TableRow key={date} className="group hover:bg-gray-50/50">
                      <TableCell className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 rounded-md">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {format(new Date(date), "EEEE, d MMM yyyy")}
                            </div>
                            <div className="text-xs text-gray-500">
                              Clinical Daily Record
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-gray-600 text-sm line-clamp-1 max-w-[400px]">
                          {notes[0]?.content || "No entries"}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-none">
                          {notes.length} record{notes.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-gray-200"
                            onClick={() => handleViewDay(date, notes)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View Records
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleDownloadPDF(date, notes)}
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No clinical records found</p>
              <p className="text-gray-500 text-sm mt-1">
                {searchQuery ? "Try adjusting your search criteria" : "No records available for this resident"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Day Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Clinical Records - {viewDialogDate && format(new Date(viewDialogDate), "PPPP")}
            </DialogTitle>
            <DialogDescription>
              Daily clinical summary
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {viewDialogNotes.map((note) => (
              <div key={note._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-600 hover:bg-blue-700">
                      {note.noteTime || "N/A"}
                    </Badge>
                    <span className="font-semibold text-gray-900">
                      {note.staffName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Logged at {format(new Date(note.createdAt), "HH:mm")}
                  </div>
                </div>
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDownloadPDF(viewDialogDate!, viewDialogNotes)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Daily Record
            </Button>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
