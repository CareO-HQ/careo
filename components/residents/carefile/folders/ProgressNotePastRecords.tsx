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
    11: "Skin Integrity / Tissue Viability",
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
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<string>("");
    const [noteTypeFilter, setNoteTypeFilter] = useState<string>("all");

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
    }, [searchQuery, filterType, selectedMonth, selectedDay, noteTypeFilter, progressNotes]);

    const applyFilters = () => {
        let filtered = [...progressNotes];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(note =>
                note.note.toLowerCase().includes(query) ||
                note.author_name.toLowerCase().includes(query) ||
                note.type.toLowerCase().includes(query)
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
        setSelectedMonth("");
        setSelectedDay("");
        setNoteTypeFilter("all");
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
            }).sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

            if (filtered.length === 0) {
                toast.error("No entries found in the selected date range");
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

            // Draw line
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(14, yPosition, pageWidth - 14, yPosition);
            yPosition += 8;

            doc.setTextColor(0);

            // Notes
            filtered.forEach((note, index) => {
                const estimatedHeight = 45; // Base height for each note
                const boxStartY = yPosition;

                // Check if we need a new page
                if (yPosition + estimatedHeight > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Note number and date
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`Note #${filtered.length - index}`, 16, yPosition + 6);

                const noteDate = format(new Date(note.date), "dd MMM yyyy");
                doc.text(`${noteDate} at ${note.time}`, pageWidth - 16, yPosition + 6, { align: "right" });

                // Note Type
                yPosition += 10;
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text("Type:", 16, yPosition);
                doc.setFont("helvetica", "normal");
                doc.text(note.type.charAt(0).toUpperCase() + note.type.slice(1), 32, yPosition);

                // Staff
                yPosition += 6;
                doc.setFont("helvetica", "bold");
                doc.text("Staff:", 16, yPosition);
                doc.setFont("helvetica", "normal");
                doc.text(note.author_name, 32, yPosition);

                // Care File Numbers (if any)
                if (note.care_file_numbers && note.care_file_numbers.length > 0) {
                    yPosition += 6;
                    doc.setFont("helvetica", "bold");
                    doc.text("Care Files:", 16, yPosition);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    const careFileText = note.care_file_numbers
                        .map(num => `${num}. ${CARE_FILE_NAMES[num] || 'Unknown'}`)
                        .join(", ");
                    const splitCareFiles = doc.splitTextToSize(careFileText, pageWidth - 50);
                    splitCareFiles.forEach((line: string, idx: number) => {
                        doc.text(line, 42, yPosition + (idx * 3));
                    });
                    yPosition += splitCareFiles.length * 3;
                    doc.setFontSize(9);
                }

                // Note content
                yPosition += 6;
                doc.setFont("helvetica", "bold");
                doc.text("Note:", 16, yPosition);

                yPosition += 5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);

                // Split text to fit within box
                const maxWidth = pageWidth - 32;
                const splitNote = doc.splitTextToSize(note.note, maxWidth);
                const maxLines = 3; // Limit lines to fit in box
                const displayNote = splitNote.slice(0, maxLines);

                displayNote.forEach((line: string, lineIndex: number) => {
                    doc.text(line, 16, yPosition + (lineIndex * 4));
                });

                if (splitNote.length > maxLines) {
                    doc.text("...", 16, yPosition + (maxLines * 4));
                }

                const finalHeight = yPosition - boxStartY + 15;

                // Note box drawn after content
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.rect(14, boxStartY, pageWidth - 28, finalHeight);

                // Move to next note position with minimal gap
                yPosition = boxStartY + finalHeight + 3;
            });

            // Save PDF
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
                    <h1 className="text-2xl font-bold">Progress Notes - All Entries</h1>
                    <p className="text-sm text-muted-foreground">
                        Complete progress notes history for {fullName}
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

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="incident">Incident</SelectItem>
                                <SelectItem value="medical">Medical</SelectItem>
                                <SelectItem value="behavioral">Behavioral</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Filter By</label>
                        <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entries</SelectItem>
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
                                    <Calendar className="h-4 w-4" />
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
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase">
                                        {note.type}
                                    </span>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                                    Recorded By:
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                    {note.author_name}
                                </p>
                            </div>

                            {note.care_file_numbers && note.care_file_numbers.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                        Care File Numbers
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {note.care_file_numbers.map((num) => (
                                            <span
                                                key={num}
                                                className="px-2 py-0.5 rounded bg-muted text-[10px] font-medium"
                                                title={CARE_FILE_NAMES[num]}
                                            >
                                                {num}. {CARE_FILE_NAMES[num]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

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
