"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Plus, Loader2, Edit3, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Resident } from "@/types";
import Link from "next/link";
import NextReviewDateField from "@/components/residents/carefile/dialogs/NextReviewDateField";

const UK_TIMEZONE = "Europe/London";

interface KeyWorkerDiaryFormProps {
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
    comment?: string | null;
    next_review_date: string | null;
    author_id: string;
    author_name: string;
    created_at: string;
    updated_at: string;
}

const normalizeDiaryEntry = (entry: KeyWorkerDiaryEntry): KeyWorkerDiaryEntry => ({
    ...entry,
    comments: entry.comments ?? entry.comment ?? "",
});

export function KeyWorkerDiaryForm({ residentId, resident }: KeyWorkerDiaryFormProps) {
    const { profile } = useProfile();
    const [diaryEntries, setDiaryEntries] = useState<KeyWorkerDiaryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(true); // Form open by default
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [comments, setComments] = useState("");
    const [entryDate, setEntryDate] = useState("");
    const [entryTime, setEntryTime] = useState("");
    const [nextReviewDate, setNextReviewDate] = useState("");
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const fetchDiaryEntries = async () => {
        if (!residentId) return;
        try {
            const { data, error } = await supabase
                .from('key_worker_diary')
                .select('*')
                .eq('resident_id', residentId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error("Fetch key worker diary error:", error);
            }

            if (data) {
                setDiaryEntries(data.map(normalizeDiaryEntry));
            }
        } catch (error) {
            console.error("Error fetching key worker diary entries:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiaryEntries();
        // Initialize date and time on component mount
        const now = new Date();
        setEntryDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
        setEntryTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
    }, [residentId]);

    useEffect(() => {
        if (showForm && !isEditing) {
            // Update date/time when opening form (but not when editing)
            const now = new Date();
            setEntryDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
            setEntryTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
        }
    }, [showForm, isEditing]);

    const handleEdit = (entry: KeyWorkerDiaryEntry) => {
        setEditingEntryId(entry.id);
        setIsEditing(true);
        setEntryDate(entry.date);
        setEntryTime(entry.time);
        setNextReviewDate(entry.next_review_date ?? "");
        setComments(entry.comments ?? entry.comment ?? "");
        setShowForm(true);
    };

    const handleCancelEdit = () => {
        setEditingEntryId(null);
        setIsEditing(false);
        setShowForm(false);
        setComments("");
        setEntryDate("");
        setEntryTime("");
        setNextReviewDate("");
    };

    const handleSubmit = async () => {
        if (!profile?.id) {
            toast.error("User information not available");
            return;
        }

        if (!comments.trim()) {
            toast.error("Please enter comments");
            return;
        }

        if (!profile.active_organization_id) {
            toast.error("Organization information not available");
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && editingEntryId) {
                // Update existing entry
                const updatePayload = {
                    date: entryDate,
                    time: entryTime,
                    comments: comments.trim(),
                    next_review_date: nextReviewDate || null,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from('key_worker_diary')
                    .update(updatePayload)
                    .eq('id', editingEntryId);

                if (error) {
                    console.error("Key worker diary update error:", error);
                    toast.error(`Failed to update: ${error.message}`);
                    return;
                }

                toast.success("Diary entry updated successfully!");
            } else {
                // Create new entry
                const insertPayload = {
                    resident_id: residentId,
                    organization_id: profile.active_organization_id,
                    care_home_id: profile.active_care_home_id || null,
                    date: entryDate,
                    time: entryTime,
                    comments: comments.trim(),
                    next_review_date: nextReviewDate || null,
                    author_id: profile.id,
                    author_name: profile.name || profile.email || "Unknown",
                };

                const { error } = await supabase
                    .from('key_worker_diary')
                    .insert(insertPayload);

                if (error) {
                    console.error("Key worker diary insert error:", error);
                    toast.error(`Failed to submit: ${error.message}`);
                    return;
                }

                toast.success("Diary entry submitted successfully!");
            }

            // Reset form but keep it open for next entry
            setComments("");
            setEditingEntryId(null);
            setIsEditing(false);
            setNextReviewDate("");
            // Keep form open and refresh date/time
            const now = new Date();
            setEntryDate(formatInTimeZone(now, UK_TIMEZONE, "yyyy-MM-dd"));
            setEntryTime(formatInTimeZone(now, UK_TIMEZONE, "HH:mm"));
            setShowForm(true);
            await fetchDiaryEntries();
        } catch (error) {
            console.error("Error submitting diary entry:", error);
            toast.error("Failed to submit diary entry");
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

            {/* Add Diary Entry Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Key Worker Diary
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {diaryEntries.length}
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
                                Add Diary Entry
                            </>
                        )}
                    </Button>
                </div>

                {showForm && (
                    <div className="rounded-xl border bg-card/50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isEditing && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                                <Edit3 className="h-4 w-4" />
                                <span className="font-medium">Editing Diary Entry</span>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Date</label>
                                <input
                                    type="date"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Time</label>
                                <input
                                    type="time"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={entryTime}
                                    onChange={(e) => setEntryTime(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Comments</label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Enter diary entry comments..."
                                className="min-h-[120px] bg-background"
                            />
                        </div>
                        <NextReviewDateField
                            value={nextReviewDate}
                            onChange={setNextReviewDate}
                            disabled={isSubmitting}
                            className="max-w-xs"
                        />

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
                                disabled={isSubmitting || !comments.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isEditing ? "Updating..." : "Saving..."}
                                    </>
                                ) : (
                                    isEditing ? "Update Diary Entry" : "Save Diary Entry"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Diary Entries List */}
            {diaryEntries.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground">Recent Entries (Latest 20)</h4>
                        <Link href={`/dashboard/residents/${residentId}/care-file-v2/v2-key-worker/past-records`}>
                            <Button variant="outline" size="sm" className="gap-2">
                                <FileText className="h-4 w-4" />
                                View All Entries
                            </Button>
                        </Link>
                    </div>
                    <div className="space-y-3">
                    {diaryEntries.map((entry, index) => (
                        <div
                            key={entry.id}
                            className="rounded-lg border bg-background/50 p-4 space-y-2 hover:border-primary/20 transition-colors"
                        >
                            <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                                <div className="flex items-center gap-3">
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
                                <div className="flex items-center gap-2">
                                    {index === 0 && !showForm && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(entry)}
                                            className="h-7 px-2 gap-1"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                            Edit
                                        </Button>
                                    )}
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
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    Comments
                                </p>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed w-full">
                                    {entry.comments ?? entry.comment ?? ""}
                                </p>
                            </div>
                            {entry.next_review_date && (
                                <div className="text-xs text-muted-foreground">
                                    Next review date: {format(new Date(entry.next_review_date), "dd MMM yyyy")}
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                </div>
            ) : (
                !showForm && (
                    <div className="text-center py-8 rounded-xl border border-dashed text-sm text-muted-foreground bg-muted/20">
                        No diary entries found for this resident.
                    </div>
                )
            )}
        </div>
    );
}
