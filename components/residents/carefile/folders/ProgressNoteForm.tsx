"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Plus, Loader2, Edit3, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";

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

interface ProgressNoteFormProps {
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

export function ProgressNoteForm({ residentId, resident }: ProgressNoteFormProps) {
    const { profile } = useProfile();
    const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(true); // Form open by default
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [noteType, setNoteType] = useState("daily");
    const [noteDate, setNoteDate] = useState("");
    const [noteTime, setNoteTime] = useState("");
    const [selectedCareFileNumbers, setSelectedCareFileNumbers] = useState<number[]>([]);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [hoveredCareFile, setHoveredCareFile] = useState<number | null>(null);

    const fetchProgressNotes = async () => {
        if (!residentId) return;
        try {
            const { data, error } = await supabase
                .from('progress_notes')
                .select('*')
                .eq('resident_id', residentId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Fetch progress notes error:", error);
            }

            if (data) {
                setProgressNotes(data);
            }
        } catch (error) {
            console.error("Error fetching progress notes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProgressNotes();
        // Initialize date and time on component mount
        const now = new Date();
        setNoteDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
        setNoteTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
    }, [residentId]);

    useEffect(() => {
        if (showForm && !isEditing) {
            // Update date/time when opening form (but not when editing)
            const now = new Date();
            setNoteDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
            setNoteTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
        }
    }, [showForm, isEditing]);

    const toggleCareFileNumber = (num: number) => {
        setSelectedCareFileNumbers(prev =>
            prev.includes(num)
                ? prev.filter(n => n !== num)
                : [...prev, num].sort((a, b) => a - b)
        );
    };

    const handleEdit = (note: ProgressNote) => {
        setEditingNoteId(note.id);
        setIsEditing(true);
        setNoteDate(note.date);
        setNoteTime(note.time);
        setNoteType(note.type);
        setNoteText(note.note);
        setSelectedCareFileNumbers(note.care_file_numbers || []);
        setShowForm(true);
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setIsEditing(false);
        setShowForm(false);
        setNoteText("");
        setNoteType("daily");
        setNoteDate("");
        setNoteTime("");
        setSelectedCareFileNumbers([]);
    };

    const handleSubmit = async () => {
        if (!profile?.id) {
            toast.error("User information not available");
            return;
        }

        if (!noteText.trim()) {
            toast.error("Please enter a progress note");
            return;
        }

        if (!profile.active_organization_id) {
            toast.error("Organization information not available");
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && editingNoteId) {
                // Update existing note
                const updatePayload = {
                    date: noteDate,
                    type: noteType,
                    time: noteTime,
                    note: noteText.trim(),
                    care_file_numbers: selectedCareFileNumbers.length > 0 ? selectedCareFileNumbers : null,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from('progress_notes')
                    .update(updatePayload)
                    .eq('id', editingNoteId);

                if (error) {
                    console.error("Progress note update error:", error);
                    toast.error(`Failed to update: ${error.message}`);
                    return;
                }

                toast.success("Progress note updated successfully!");
            } else {
                // Create new note
                const insertPayload = {
                    resident_id: residentId,
                    organization_id: profile.active_organization_id,
                    date: noteDate,
                    type: noteType,
                    time: noteTime,
                    note: noteText.trim(),
                    author_id: profile.id,
                    author_name: profile.name || profile.email || "Unknown",
                    care_file_numbers: selectedCareFileNumbers.length > 0 ? selectedCareFileNumbers : null,
                };

                const { error } = await supabase
                    .from('progress_notes')
                    .insert(insertPayload);

                if (error) {
                    console.error("Progress note insert error:", error);
                    toast.error(`Failed to submit: ${error.message}`);
                    return;
                }

                toast.success("Progress note submitted successfully!");
            }

            // Reset form but keep it open for next entry
            setNoteText("");
            setNoteType("daily");
            setSelectedCareFileNumbers([]);
            setEditingNoteId(null);
            setIsEditing(false);
            // Keep form open and refresh date/time
            const now = new Date();
            setNoteDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
            setNoteTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
            setShowForm(true);
            await fetchProgressNotes();
        } catch (error) {
            console.error("Error submitting progress note:", error);
            toast.error("Failed to submit progress note");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
            {/* Resident Header Information */}
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

            {/* Add Progress Note Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Progress Notes
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {progressNotes.length}
                        </span>
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (!showForm) {
                                setShowForm(true);
                            } else if (!isEditing) {
                                setShowForm(false);
                            }
                        }}
                        className="gap-2"
                        disabled={isEditing}
                    >
                        {showForm ? (
                            <>
                                <ChevronUp className="h-4 w-4" />
                                Collapse Form
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Add Progress Note
                            </>
                        )}
                    </Button>
                </div>

                {showForm && (
                    <div className="rounded-xl border bg-card/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isEditing && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                                <Edit3 className="h-4 w-4" />
                                <span className="font-medium">Editing Progress Note</span>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Date</label>
                                <input
                                    type="date"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={noteDate}
                                    onChange={(e) => setNoteDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Time</label>
                                <input
                                    type="time"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={noteTime}
                                    onChange={(e) => setNoteTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Note Type</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="incident">Incident</option>
                                    <option value="medical">Medical</option>
                                    <option value="behavioral">Behavioral</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Care File Numbers (Select multiple)</label>
                            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-3 border rounded-md bg-background relative">
                                {Array.from({ length: 18 }, (_, i) => i + 1).map((num) => (
                                    <div key={num} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => toggleCareFileNumber(num)}
                                            onMouseEnter={() => setHoveredCareFile(num)}
                                            onMouseLeave={() => setHoveredCareFile(null)}
                                            className={`h-8 w-8 rounded-md border text-xs font-medium transition-all ${
                                                selectedCareFileNumbers.includes(num)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background hover:bg-muted border-input"
                                            }`}
                                        >
                                            {num}
                                        </button>
                                        {hoveredCareFile === num && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md shadow-lg text-xs font-medium text-blue-900 whitespace-nowrap z-50 pointer-events-none">
                                                {CARE_FILE_NAMES[num]}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-blue-50 border-r border-b border-blue-200 transform rotate-45"></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {selectedCareFileNumbers.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Selected: {selectedCareFileNumbers.join(", ")}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Progress Note</label>
                            <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Enter progress note details..."
                                className="min-h-[120px] bg-background"
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !noteText.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEditing ? "Updating..." : "Saving..."}
                                    </>
                                ) : (
                                    isEditing ? "Update Progress Note" : "Save Progress Note"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Progress Notes List */}
            {progressNotes.length > 0 ? (
                <div className="space-y-3">
                    {progressNotes.map((note, index) => (
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
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                                            note.type === "incident"
                                                ? "bg-red-50 text-red-600 border-red-200"
                                                : note.type === "medical"
                                                ? "bg-blue-50 text-blue-600 border-blue-200"
                                                : note.type === "behavioral"
                                                ? "bg-orange-50 text-orange-600 border-orange-200"
                                                : "bg-green-50 text-green-600 border-green-200"
                                        }`}>
                                            {note.type}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
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
                                    {index === 0 && !showForm && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(note)}
                                            className="h-7 px-2 gap-1"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                            Edit
                                        </Button>
                                    )}
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
                !showForm && (
                    <div className="text-center py-8 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                        No progress notes found for this resident.
                    </div>
                )
            )}
        </div>
    );
}
