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
import autoTable from "jspdf-autotable";

const UK_TIMEZONE = "Europe/London";

interface KeyWorkerDiaryPastRecordsProps {
    residentId: string;
    resident: Resident;
}

interface KeyWorkerDiaryEntry {
    id: string;
    resident_id: string;
    organization_id: string;
    date: string;
    time: string;
    comments: string;
    author_id: string;
    author_name: string;
    created_at: string;
    updated_at: string;
}

export function KeyWorkerDiaryPastRecords({ residentId, resident }: KeyWorkerDiaryPastRecordsProps) {
    const router = useRouter();
    const [diaryEntries, setDiaryEntries] = useState<KeyWorkerDiaryEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<KeyWorkerDiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "month" | "day">("all");
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

    const fetchDiaryEntries = async () => {
        if (!residentId) return;
        try {
            const { data, error } = await supabase
                .from('key_worker_diary')
                .select('*')
                .eq('resident_id', residentId)
                .order('date', { ascending: false })
                .order('time', { ascending: false });

            if (error) {
                console.error("Fetch key worker diary error:", error);
                toast.error("Failed to load diary entries");
            }

            if (data) {
                setDiaryEntries(data);
                setFilteredEntries(data);
            }
        } catch (error) {
            console.error("Error fetching key worker diary entries:", error);
            toast.error("Failed to load diary entries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiaryEntries();
    }, [residentId]);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, filterType, selectedMonth, selectedDay, diaryEntries]);

    const applyFilters = () => {
        let filtered = [...diaryEntries];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(entry =>
                entry.comments.toLowerCase().includes(query) ||
                entry.author_name.toLowerCase().includes(query)
            );
        }

        // Apply date filter
        if (filterType === "month" && selectedMonth) {
            const [year, month] = selectedMonth.split("-");
            filtered = filtered.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate.getFullYear() === parseInt(year) &&
                    entryDate.getMonth() === parseInt(month) - 1;
            });
        } else if (filterType === "day" && selectedDay) {
            filtered = filtered.filter(entry => entry.date === selectedDay);
        }

        setFilteredEntries(filtered);
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setFilterType("all");
        setSelectedMonth("");
        setSelectedDay("");
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
            // Filter entries based on month range
            const filtered = diaryEntries.filter(entry => {
                const entryDate = entry.date;
                return entryDate >= downloadStartMonth && entryDate <= downloadEndMonth + "-31";
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
            doc.text("Key Worker Diary", pageWidth / 2, yPosition, { align: "center" });
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
            doc.text(`Total Entries: ${filtered.length}`, 14, yPosition);
            yPosition += 10;

            // Draw line
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(14, yPosition, pageWidth - 14, yPosition);
            yPosition += 8;

            doc.setTextColor(0);

            // Entries
            filtered.forEach((entry, index) => {
                const entryHeight = 35;

                // Check if we need a new page
                if (yPosition + entryHeight > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Entry box
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.rect(14, yPosition, pageWidth - 28, entryHeight);

                // Entry number and date
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`Entry #${filtered.length - index}`, 16, yPosition + 6);

                const entryDate = format(new Date(entry.date), "dd MMM yyyy");
                doc.text(`${entryDate} at ${entry.time}`, pageWidth - 16, yPosition + 6, { align: "right" });

                // Staff
                yPosition += 10;
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text("Staff:", 16, yPosition);
                doc.setFont("helvetica", "normal");
                doc.text(entry.author_name, 32, yPosition);

                // Comments
                yPosition += 6;
                doc.setFont("helvetica", "bold");
                doc.text("Comments:", 16, yPosition);

                yPosition += 5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);

                // Split text to fit within box
                const maxWidth = pageWidth - 32;
                const splitComments = doc.splitTextToSize(entry.comments, maxWidth);
                const maxLines = 2; // Limit lines to fit in box
                const displayComments = splitComments.slice(0, maxLines);

                displayComments.forEach((line: string, lineIndex: number) => {
                    doc.text(line, 16, yPosition + (lineIndex * 4));
                });

                if (splitComments.length > maxLines) {
                    doc.text("...", 16, yPosition + (maxLines * 4));
                }

                yPosition += entryHeight + 6;
            });

            // Footer on last page
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.text("This is a computer-generated document. No signature required.", pageWidth / 2, pageHeight - 10, { align: "center" });
            doc.text("iCare Home Management System", pageWidth / 2, pageHeight - 6, { align: "center" });

            // Save PDF
            const fileName = `Key_Worker_Diary_${resident.first_name}_${resident.last_name}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
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
                    <p className="mt-2 text-muted-foreground">Loading diary entries…</p>
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
                    <h1 className="text-2xl font-bold">Key Worker Diary - All Entries</h1>
                    <p className="text-sm text-muted-foreground">
                        Complete diary history for {fullName}
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
                            <DialogTitle>Download Diary Entries</DialogTitle>
                            <DialogDescription>
                                Select a date range to download diary entries as PDF
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
                                placeholder="Search comments or staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
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
                    <span className="font-medium">Showing {filteredEntries.length} of {diaryEntries.length} entries</span>
                </div>
            </div>

            {/* Entries List */}
            {filteredEntries.length > 0 ? (
                <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className="rounded-lg border bg-background/50 p-4 space-y-2 hover:border-primary/20 transition-colors"
                        >
                            <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4" />
                                    <p className="font-medium">
                                        {entry.date && entry.time
                                            ? `${format(new Date(entry.date), "dd MMM yyyy")} ${entry.time}`
                                            : formatInTimeZone(
                                                new Date(entry.created_at),
                                                UK_TIMEZONE,
                                                "dd MMM yyyy HH:mm"
                                            )
                                        }
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                                    Recorded By:
                                </span>
                                <p className="text-sm font-semibold text-foreground">
                                    {entry.author_name}
                                </p>
                            </div>

                            <div className="space-y-1 w-full">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">
                                    Comments
                                </p>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed w-full">
                                    {entry.comments}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                    {searchQuery || filterType !== "all" ? (
                        <>
                            <p className="font-medium mb-1">No entries match your filters</p>
                            <p className="text-xs">Try adjusting your search or filter criteria</p>
                        </>
                    ) : (
                        <>
                            <p className="font-medium mb-1">No diary entries found</p>
                            <p className="text-xs">Diary entries will appear here once created</p>
                        </>
                    )}
                </div>
            )}

        </div>
    );
}
