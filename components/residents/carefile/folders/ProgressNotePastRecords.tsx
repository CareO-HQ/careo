"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Calendar, Filter, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Resident } from "@/types";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

const UK_TIMEZONE = "Europe/London";

// Map care file numbers to folder names
const CARE_FILE_NAMES: Record<number, string> = {
    1: "Pre-Admission",
    2: "Admission",
    3: "Maintaining a Safe Environment",
    4: "Dependency",
    5: "This Is My Life",
    6: "Medication",
    7: "Mobility",
    8: "Nutrition and Hydration",
    9: "Incontinence",
    10: "Personal Hygiene and Dressing",
    12: "Additional Care Plans",
    13: "Psychological & Emotional Needs",
    14: "Residents' Valuables and Personal Property",
    15: "Record of Specimens",
    16: "Confidential Records",
    17: "Safeguarding & DoLS",
    18: "Key Worker Diary",
};

interface ProgressNotePastRecordsProps {
    residentId: string;
    resident: Resident;
}

interface ProgressNote {
    id: string;
    resident_id: string;
    organization_id: string;
    date: string;
    type: string;
    time: string;
    note: string;
    author_id: string;
    author_name: string;
    care_file_numbers?: number[];
    created_at: string;
    updated_at: string;
}

export function ProgressNotePastRecords({ residentId, resident }: ProgressNotePastRecordsProps) {
    const router = useRouter();
    const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<ProgressNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "month" | "day">("all");
    const [noteTypeFilter, setNoteTypeFilter] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<string>("");

    // Download dialog state
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [downloadStartMonth, setDownloadStartMonth] = useState<string>("");
    const [downloadEndMonth, setDownloadEndMonth] = useState<string>("");
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Generate month options (last 12 months)
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
            value: format(date, "yyyy-MM"),
            label: format(date, "MMMM yyyy")
        };
    });

    const noteTypeOptions = [
        { value: "all", label: "All Types" },
        { value: "daily", label: "Daily" },
        { value: "incident", label: "Incident" },
        { value: "medical", label: "Medical" },
        { value: "behavioral", label: "Behavioral" },
        { value: "other", label: "Other" },
    ];

    const fetchProgressNotes = async () => {
        if (!residentId) return;
        try {
            const { data, error } = await supabase
                .from('progress_notes')
                .select('*')
                .eq('resident_id', residentId)
                .order('date', { ascending: false })
                .order('time', { ascending: false });

            if (error) {
                console.error("Fetch progress notes error:", error);
                toast.error("Failed to load progress notes");
            }

            if (data) {
                setProgressNotes(data);
                setFilteredNotes(data);
            }
        } catch (error) {
            console.error("Error fetching progress notes:", error);
            toast.error("Failed to load progress notes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgressNotes();
    }, [residentId]);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, filterType, noteTypeFilter, selectedMonth, selectedDay, progressNotes]);

    const applyFilters = () => {
        let filtered = [...progressNotes];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(note =>
                note.note.toLowerCase().includes(query) ||
                note.author_name.toLowerCase().includes(query)
            );
        }

        // Apply note type filter
        if (noteTypeFilter !== "all") {
            filtered = filtered.filter(note => note.type === noteTypeFilter);
        }

        // Apply date filter
        if (filterType === "month" && selectedMonth) {
            const [year, month] = selectedMonth.split("-");
            filtered = filtered.filter(note => {
                const noteDate = new Date(note.date);
                return noteDate.getFullYear() === parseInt(year) &&
                    noteDate.getMonth() === parseInt(month) - 1;
            });
        } else if (filterType === "day" && selectedDay) {
            filtered = filtered.filter(note => note.date === selectedDay);
        }

        setFilteredNotes(filtered);
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setFilterType("all");
        setNoteTypeFilter("all");
        setSelectedMonth("");
        setSelectedDay("");
    };

    const getNoteTypeBadgeClass = (type: string) => {
        switch (type) {
            case "incident": return "bg-red-50 text-red-600 border-red-200";
            case "medical": return "bg-blue-50 text-blue-600 border-blue-200";
            case "behavioral": return "bg-orange-50 text-orange-600 border-orange-200";
            default: return "bg-green-50 text-green-600 border-green-200";
        }
    };

    const generatePDF = async () => {
        if (!downloadStartMonth || !downloadEndMonth) {
            toast.error("Please select both start and end months");
            return;
        }
        if (downloadStartMonth > downloadEndMonth) {
            toast.error("Start month must be before or equal to end month");
            return;
        }

        setIsGeneratingPDF(true);

        try {
            // Filter notes based on month range
            const filtered = progressNotes.filter(note => {
                const noteDate = note.date;
                return noteDate >= downloadStartMonth && noteDate <= downloadEndMonth + "-31";
            }).sort((a, b) => a.date.localeCompare(b.date));

            if (filtered.length === 0) {
                toast.error("No notes found in the selected date range");
                setIsGeneratingPDF(false);
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let yPosition = 20;

            // Header
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Progress Notes", pageWidth / 2, yPosition, { align: "center" });
            yPosition += 10;

            // Resident Information
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const fullName = `${resident.first_name} ${resident.last_name}`;
            const dateOfBirth = resident.date_of_birth
                ? format(new Date(resident.date_of_birth), "dd MMM yyyy")
                : "N/A";

            doc.text(`Resident: ${fullName}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Date of Birth: ${dateOfBirth}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Room Number: ${resident.room_number || "N/A"}`, 14, yPosition);
            yPosition += 6;

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, yPosition);
            yPosition += 4;
            doc.text(`Period: ${format(parseISO(downloadStartMonth + "-01"), "MMMM yyyy")} - ${format(parseISO(downloadEndMonth + "-01"), "MMMM yyyy")}`, 14, yPosition);
            yPosition += 4;
            doc.text(`Total Notes: ${filtered.length}`, 14, yPosition);
            yPosition += 10;

            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(14, yPosition, pageWidth - 14, yPosition);
            yPosition += 8;

            doc.setTextColor(0);

            // Notes
            filtered.forEach((note) => {
                const noteContentLines = doc.splitTextToSize(note.note, pageWidth - 32);
                const noteHeight = Math.max(40, 24 + (noteContentLines.length * 4) + 4);

                if (yPosition + noteHeight > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }

                const boxStartY = yPosition;

                // Note type badge (text)
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text(note.type.toUpperCase(), 16, yPosition + 6);

                // Date/Time  
                const entryDate = format(new Date(note.date), "dd MMM yyyy");
                doc.setFont("helvetica", "normal");
                doc.text(`${entryDate} at ${note.time}`, pageWidth - 16, yPosition + 6, { align: "right" });

                // Staff
                yPosition += 10;
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text("Recorded By:", 16, yPosition);
                doc.setFont("helvetica", "normal");
                doc.text(note.author_name, 50, yPosition);

                // Care file numbers
                if (note.care_file_numbers && note.care_file_numbers.length > 0) {
                    yPosition += 6;
                    doc.setFont("helvetica", "bold");
                    doc.text("Care Files:", 16, yPosition);
                    doc.setFont("helvetica", "normal");
                    doc.text(note.care_file_numbers.join(", "), 40, yPosition);
                }

                // Note content
                yPosition += 6;
                doc.setFont("helvetica", "bold");
                doc.text("Note:", 16, yPosition);
                yPosition += 5;
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");

                noteContentLines.forEach((line: string, lineIndex: number) => {
                    doc.text(line, 16, yPosition + (lineIndex * 4));
                });

                yPosition += (noteContentLines.length * 4);

                // Box
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.rect(14, boxStartY, pageWidth - 28, yPosition - boxStartY + 4);

                yPosition += 7;
            });

            // Footer
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text("This is a computer-generated document. No signature required.", pageWidth / 2, pageHeight - 10, { align: "center" });
            doc.text("iCare Home Management System", pageWidth / 2, pageHeight - 6, { align: "center" });

            const fileName = `Progress_Notes_${resident.first_name}_${resident.last_name}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
            doc.save(fileName);

            toast.success("PDF downloaded successfully");
            setShowDownloadDialog(false);
            setDownloadStartMonth("");
            setDownloadEndMonth("");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="mt-2 text-muted-foreground">Loading progress notes…</p>
                </div>
            </div>
        );
    }

    const fullName = `${resident.first_name} ${resident.last_name}`;
    const dateOfBirth = resident.date_of_birth
        ? format(new Date(resident.date_of_birth), "dd MMM yyyy")
        : "N/A";
    const roomNumber = resident.room_number || "N/A";

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Progress Notes - All Records</h1>
                    <p className="text-sm text-muted-foreground">
                        Complete progress note history for {fullName}
                    </p>
                </div>
                <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Download PDF
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Download Progress Notes</DialogTitle>
                            <DialogDescription>
                                Select a date range to download progress notes as PDF
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">From Month</label>
                                    <Select value={downloadStartMonth} onValueChange={setDownloadStartMonth}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select start month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">To Month</label>
                                    <Select value={downloadEndMonth} onValueChange={setDownloadEndMonth}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select end month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setShowDownloadDialog(false)} disabled={isGeneratingPDF}>
                                    Cancel
                                </Button>
                                <Button onClick={generatePDF} className="gap-2" disabled={isGeneratingPDF}>
                                    {isGeneratingPDF ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4" />
                                            Download PDF
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Resident Information */}
            <div className="rounded-xl border bg-muted/20 p-6">
                <h2 className="text-xl font-bold mb-4">Resident Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resident Name</p>
                        <p className="text-sm font-semibold text-foreground">{fullName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                        <p className="text-sm font-semibold text-foreground">{dateOfBirth}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Room Number</p>
                        <p className="text-sm font-semibold text-foreground">{roomNumber}</p>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                        Reset Filters
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search notes or staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Note Type Filter */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Note Type</label>
                        <Select value={noteTypeFilter} onValueChange={setNoteTypeFilter}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {noteTypeOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Filter Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Filter By Date</label>
                        <Select value={filterType} onValueChange={(value: "all" | "month" | "day") => setFilterType(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="month">By Month</SelectItem>
                                <SelectItem value="day">By Specific Day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month Selector */}
                    {filterType === "month" && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Select Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Day Selector */}
                    {filterType === "day" && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Select Day</label>
                            <Input
                                type="date"
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Results Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Showing {filteredNotes.length} of {progressNotes.length} notes</span>
                </div>
            </div>

            {/* Notes List */}
            {filteredNotes.length > 0 ? (
                <div className="space-y-3">
                    {filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            className="rounded-lg border bg-background/50 p-4 space-y-2 hover:border-primary/20 transition-colors"
                        >
                            <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <p className="font-medium flex items-center gap-2">
                                        <span className="text-muted-foreground/60 italic">
                                            {note.type.charAt(0).toUpperCase() + note.type.slice(1)} Note
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getNoteTypeBadgeClass(note.type)}`}>
                                            {note.type}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <p className="font-medium">
                                        {note.date && note.time
                                            ? `${format(new Date(note.date), "dd MMM yyyy")} ${note.time}`
                                            : formatInTimeZone(
                                                new Date(note.created_at),
                                                UK_TIMEZONE,
                                                "dd MMM yyyy HH:mm"
                                            )
                                        }
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="flex items-baseline justify-between gap-4 flex-wrap">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                                        Recorded By:
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">
                                        {note.author_name}
                                    </p>
                                </div>
                                {note.care_file_numbers && note.care_file_numbers.length > 0 && (
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                                            Care Files:
                                        </span>
                                        <div className="flex gap-1 flex-wrap">
                                            {note.care_file_numbers.map((num) => (
                                                <span
                                                    key={num}
                                                    title={CARE_FILE_NAMES[num]}
                                                    className="inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                                >
                                                    {num}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1 w-full">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">
                                    Note
                                </p>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed w-full">
                                    {note.note}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                    {searchQuery || filterType !== "all" || noteTypeFilter !== "all" ? (
                        <>
                            <p className="font-medium mb-1">No notes match your filters</p>
                            <p className="text-xs">Try adjusting your search or filter criteria</p>
                        </>
                    ) : (
                        <>
                            <p className="font-medium mb-1">No progress notes found</p>
                            <p className="text-xs">Progress notes will appear here once created</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
