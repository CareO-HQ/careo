"use client";

import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { InteractiveBodyMap } from "./InteractiveBodyMap";
import { BodyMapEntryForm } from "./BodyMapEntryForm";
import { BodyRegion, BodyMapEntry, BodyMapData, BodyMapSession } from "@/types/body-map";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeBodyMapData } from "@/lib/body-map-utils";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import { generateBodyMapPDF } from "@/lib/body-map-pdf-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    Plus,
    Download,
    Map as MapIcon,
    Calendar,
    Clock,
    Edit2,
    Trash2
} from "lucide-react";

interface BodyMapDialogProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId?: string; // Made optional
    residentName?: string;
    incidentDate?: string;
    incidentType?: string;
    initialData?: BodyMapData;
    onSave?: (data: BodyMapData) => void | Promise<void>;
    orgLogoUrl?: string;
    simpleMode?: boolean;
}

export function BodyMapDialog({
    isOpen,
    onClose,
    incidentId,
    residentName,
    incidentDate,
    incidentType,
    initialData,
    onSave,
    orgLogoUrl,
    simpleMode = false
}: BodyMapDialogProps) {
    const [data, setData] = React.useState<BodyMapData>(() => normalizeBodyMapData(initialData, incidentDate));
    const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = React.useState<BodyRegion | null>(null);
    const [editingEntry, setEditingEntry] = React.useState<BodyMapEntry | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [viewMode, setViewMode] = React.useState(false);
    const [isEditingLabel, setIsEditingLabel] = React.useState(false);
    const [tempLabel, setTempLabel] = React.useState("");

    const currentSession = data.sessions.find(s => s.id === currentSessionId);

    const handleDownloadPDF = async () => {
        if (!currentSession || !currentSession.entries || currentSession.entries.length === 0) {
            toast.error("No entries to download in this session");
            return;
        }

        setIsDownloading(true);
        try {
            await generateBodyMapPDF({
                residentName,
                incidentDate,
                incidentType,
                currentSession,
                orgLogoUrl
            });
            toast.success("PDF generated successfully");
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF locally");
        } finally {
            setIsDownloading(false);
        }
    };

    // Synchronize data when initialData changes
    React.useEffect(() => {
        if (initialData) {
            const normalized = normalizeBodyMapData(initialData, incidentDate);
            setData(normalized);

            // Set first session as default if none selected
            if (!currentSessionId && normalized.sessions.length > 0) {
                setCurrentSessionId(normalized.sessions[0].id);
            }
        }
    }, [initialData, incidentId, incidentDate]);

    const handleRegionClick = (region: BodyRegion) => {
        if (!currentSession) {
            toast.error("Please select or create a session first");
            return;
        }
        setSelectedRegion(region);
        // Find the first active entry for this region if it exists
        const existing = currentSession.entries.find(e => e.region_id === region.region_id && e.status === "active")
            || currentSession.entries.find(e => e.region_id === region.region_id);
        setEditingEntry(existing || null);
    };

    const handleSubmitEntry = async (formData: any) => {
        if (!selectedRegion || !currentSession) return;

        const now = new Date().toISOString();
        let newEntries = [...currentSession.entries];

        if (editingEntry) {
            // Update existing
            newEntries = newEntries.map(e =>
                e.id === editingEntry.id ? { ...e, ...formData } : e
            );
        } else {
            // Add new
            const newEntry: BodyMapEntry = {
                id: uuidv4(),
                region_id: selectedRegion.region_id,
                region_name: selectedRegion.region_name,
                status: "active",
                ...formData,
                date_time: formData.date_time || now
            };
            newEntries.push(newEntry);
        }

        const newSessions = data.sessions.map(s => {
            if (s.id === currentSessionId) {
                const entryTime = formData.date_time || now;
                return {
                    ...s,
                    entries: newEntries,
                    created_at: entryTime, // Session time reflects the last added/edited entry
                    date: entryTime.split("T")[0], // Keep session date in sync
                    updated_at: now
                };
            }
            return s;
        });

        await saveToSupabase({ sessions: newSessions });
    };

    const handleDeleteEntry = async () => {
        if (!editingEntry || !currentSession) return;

        const newEntries = currentSession.entries.filter(e => e.id !== editingEntry.id);
        const now = new Date().toISOString();

        const newSessions = data.sessions.map(s => {
            if (s.id === currentSessionId) {
                // If we deleted the entry that gave the session its time, 
                // we should probably pick the next most recent one, or keep current.
                // For simplicity and to match "last added", we'll just keep the current session time
                // unless it was the only entry, in which case we keep session creation time.
                let sessionTime = s.created_at;
                let sessionDate = s.date;

                if (newEntries.length > 0) {
                    // Sort entries by date_time and take the latest
                    const latestEntry = [...newEntries].sort((a, b) =>
                        new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
                    )[0];
                    sessionTime = latestEntry.date_time;
                    sessionDate = latestEntry.date_time.split("T")[0];
                }

                return {
                    ...s,
                    entries: newEntries,
                    created_at: sessionTime,
                    date: sessionDate,
                    updated_at: now
                };
            }
            return s;
        });

        await saveToSupabase({ sessions: newSessions });
    };

    const saveToSupabase = async (newData: BodyMapData) => {
        setIsSaving(true);
        try {
            // 1. If incidentId is provided, update the incidents table (legacy/internal handling)
            if (incidentId) {
                const { error } = await supabase
                    .from("incidents")
                    .update({ body_map_data: newData })
                    .eq("id", incidentId);

                if (error) throw error;
            }

            // 2. If onSave callback is provided, call it
            if (onSave) {
                await onSave(newData);
            }

            setData(newData);
            setSelectedRegion(null);
            setEditingEntry(null);
            toast.success("Body map updated");
        } catch (err) {
            console.error("Error saving body map:", err);
            toast.error("Failed to save body map");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateSession = async () => {
        const newSession: BodyMapSession = {
            id: uuidv4(),
            date: new Date().toISOString().split("T")[0],
            label: `Session ${data.sessions.length + 1}`,
            entries: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const newData = {
            sessions: [...data.sessions, newSession]
        };

        await saveToSupabase(newData);
        setCurrentSessionId(newSession.id);
        setSelectedRegion(null);
        setEditingEntry(null);
    };

    // In simpleMode (used by specific care folders), skip session selection/history:
    // always keep a single active session and show the map + observations directly.
    // Only run this logic when the dialog is actually open to avoid side effects on page load.
    React.useEffect(() => {
        if (!simpleMode || !isOpen) return;

        if (data.sessions.length === 0 && !currentSessionId) {
            // Auto-create a session (will persist via onSave if provided)
            void handleCreateSession();
            return;
        }

        if (data.sessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(data.sessions[0].id);
        }
    }, [simpleMode, isOpen, data.sessions, currentSessionId, handleCreateSession]);

    const handleRenameSession = async () => {
        if (!currentSession || !tempLabel.trim()) {
            setIsEditingLabel(false);
            return;
        }

        const updatedSessions = data.sessions.map(s =>
            s.id === currentSessionId ? { ...s, label: tempLabel.trim(), updated_at: new Date().toISOString() } : s
        );

        const newData = { sessions: updatedSessions };
        await saveToSupabase(newData);
        setIsEditingLabel(false);
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
            return;
        }

        const updatedSessions = data.sessions.filter(s => s.id !== sessionId);
        const newData = { sessions: updatedSessions };
        await saveToSupabase(newData);

        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
            setSelectedRegion(null);
            setEditingEntry(null);
        }
    };

    const handleUpdateSessionDate = async (sessionId: string, newDate: string) => {
        if (!newDate) return;

        const session = data.sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Update the date part of created_at while keeping the time
        const currentTimestamp = new Date(session.created_at);
        const [year, month, day] = newDate.split("-").map(Number);
        currentTimestamp.setFullYear(year);
        currentTimestamp.setMonth(month - 1); // Month is 0-indexed
        currentTimestamp.setDate(day);

        const updatedSessions = data.sessions.map(s =>
            s.id === sessionId ? { ...s, date: newDate, created_at: currentTimestamp.toISOString(), updated_at: new Date().toISOString() } : s
        );

        const newData = { sessions: updatedSessions };
        await saveToSupabase(newData);
    };

    const handleUpdateSessionTime = async (sessionId: string, newTime: string) => {
        if (!newTime) return;

        const session = data.sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Update the timestamp in created_at to reflect the new time
        const currentTimestamp = new Date(session.created_at);
        const [hours, minutes] = newTime.split(":").map(Number);
        currentTimestamp.setHours(hours);
        currentTimestamp.setMinutes(minutes);

        const updatedSessions = data.sessions.map(s =>
            s.id === sessionId ? { ...s, created_at: currentTimestamp.toISOString(), updated_at: new Date().toISOString() } : s
        );

        const newData = { sessions: updatedSessions };
        await saveToSupabase(newData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[1300px] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden text-slate-900 border-none shadow-2xl">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        {currentSessionId && !simpleMode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setCurrentSessionId(null);
                                    setSelectedRegion(null);
                                    setEditingEntry(null);
                                }}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <DialogTitle className="flex items-center gap-2 group">
                                {isEditingLabel ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={tempLabel}
                                            onChange={(e) => setTempLabel(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRenameSession();
                                                if (e.key === "Escape") setIsEditingLabel(false);
                                            }}
                                            className="px-2 py-1 text-base font-semibold border rounded bg-white w-64 focus:outline-none focus:ring-1 focus:ring-primary"
                                            autoFocus
                                            onBlur={handleRenameSession}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <span>{simpleMode ? "Body Map" : (currentSession ? currentSession.label : "Body Mapping Sessions")}</span>
                                        {currentSession && !simpleMode && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setTempLabel(currentSession.label);
                                                    setIsEditingLabel(true);
                                                }}
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </DialogTitle>
                            {currentSession && (
                                <p className="text-sm text-muted-foreground">
                                    {new Date(currentSession.date).toLocaleDateString("en-GB")}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!currentSessionId && !simpleMode ? (
                            <Button onClick={handleCreateSession} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create New Body Map
                            </Button>
                        ) : (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isDownloading || !currentSession || currentSession.entries.length === 0}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md border",
                                    isDownloading || !currentSession || currentSession.entries.length === 0
                                        ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
                                )}
                            >
                                <Download className="w-4 h-4" />
                                {isDownloading ? "Generating..." : "Download PDF"}
                            </button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-row">
                    {/* Left: Body Map Area */}
                    <div className="flex-[3] p-6 overflow-hidden bg-white border-r border-slate-200">
                        <div className="flex justify-center h-full items-center">
                            {currentSession ? (
                                <InteractiveBodyMap
                                    entries={currentSession.entries}
                                    onRegionClick={(region) => {
                                        if (!viewMode) handleRegionClick(region);
                                    }}
                                    isLoading={isSaving}
                                    selectedRegionId={selectedRegion?.region_id}
                                    viewMode={viewMode}
                                />
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="p-6 bg-slate-50 rounded-full inline-block">
                                        <MapIcon className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900">Select a Session</h3>
                                        <p className="text-slate-500 max-w-xs mx-auto">
                                            Choose an existing body map session from the list or create a new one to start documenting.
                                        </p>
                                    </div>
                                    <Button onClick={handleCreateSession} variant="outline" className="mt-4">
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Body Map Session
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Form Area / Summary */}
                    <div className="flex-[2] overflow-hidden bg-slate-50/50 relative">
                        <ScrollArea className="h-full px-6 py-6">
                            {!currentSessionId && !simpleMode ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium">History</h3>
                                        <Badge variant="outline">{data.sessions.length} sessions</Badge>
                                    </div>

                                    {data.sessions.length > 0 ? (
                                        <div className="space-y-6">
                                            {/* Group sessions by date */}
                                            {Object.entries(
                                                data.sessions.reduce((acc, session) => {
                                                    const date = session.date;
                                                    if (!acc[date]) acc[date] = [];
                                                    acc[date].push(session);
                                                    return acc;
                                                }, {} as Record<string, BodyMapSession[]>)
                                            )
                                                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                                                .map(([date, sessions]) => (
                                                    <div key={date} className="space-y-3">
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(date).toLocaleDateString("en-GB", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </div>
                                                        <div className="space-y-3">
                                                            {sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((session) => (
                                                                <div
                                                                    key={session.id}
                                                                    onClick={() => setCurrentSessionId(session.id)}
                                                                    className="p-4 border rounded-xl bg-white shadow-sm cursor-pointer hover:border-primary hover:shadow-md transition-all group border-l-4 border-l-slate-200 hover:border-l-primary"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                                                                                {session.label}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setCurrentSessionId(session.id);
                                                                                        setTempLabel(session.label);
                                                                                        setIsEditingLabel(true);
                                                                                    }}
                                                                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                >
                                                                                    <Edit2 className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                                                <div className="flex items-center gap-1 group/date relative">
                                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                                    <input
                                                                                        type="date"
                                                                                        value={session.date}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateSessionDate(session.id, e.target.value);
                                                                                        }}
                                                                                        className="bg-transparent border-none p-0 text-xs focus:ring-0 cursor-pointer hover:text-primary"
                                                                                        required
                                                                                    />
                                                                                </div>
                                                                                <span className="text-slate-300">|</span>
                                                                                <div className="flex items-center gap-1 group/time relative">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    <input
                                                                                        type="time"
                                                                                        value={new Date(session.created_at).toTimeString().slice(0, 5)}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateSessionTime(session.id, e.target.value);
                                                                                        }}
                                                                                        className="bg-transparent border-none p-0 text-xs focus:ring-0 cursor-pointer hover:text-primary"
                                                                                        required
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                                                                                {session.entries.length} {session.entries.length === 1 ? 'point' : 'points'}
                                                                            </Badge>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteSession(session.id);
                                                                                }}
                                                                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                                            <p className="text-sm font-medium text-slate-500">No sessions yet</p>
                                        </div>
                                    )}
                                </div>
                            ) : selectedRegion ? (
                                <BodyMapEntryForm
                                    regionName={selectedRegion.region_name}
                                    initialData={editingEntry || undefined}
                                    onSubmit={handleSubmitEntry}
                                    onCancel={() => {
                                        setSelectedRegion(null);
                                        setEditingEntry(null);
                                    }}
                                    onDelete={editingEntry ? handleDeleteEntry : undefined}
                                    readOnly={viewMode}
                                />
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium">Recorded Observations</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Click on a region to add or view details.
                                        </p>
                                    </div>

                                    {(currentSession?.entries || []).length > 0 ? (
                                        <div className="space-y-3">
                                            {currentSession?.entries.map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="p-3 border rounded-lg bg-white shadow-sm cursor-pointer hover:border-primary transition-colors"
                                                    onClick={() => {
                                                        const region = BODY_REGIONS.find(r => r.region_id === entry.region_id);
                                                        if (region) {
                                                            setSelectedRegion(region);
                                                            setEditingEntry(entry);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm truncate">{entry.region_name}</span>
                                                                <span className="text-[10px] text-muted-foreground capitalize border-l pl-2 leading-none">
                                                                    {entry.condition_type}
                                                                </span>
                                                            </div>
                                                            {entry.measurements && (
                                                                <p className="text-[10px] mt-0.5 italic text-slate-500 truncate">{entry.measurements}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1.5 shrink-0 ml-auto">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewMode(true);
                                                                    const region = BODY_REGIONS.find(r => r.region_id === entry.region_id);
                                                                    if (region) {
                                                                        setSelectedRegion(region);
                                                                        setEditingEntry(entry);
                                                                    }
                                                                }}
                                                            >
                                                                View
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewMode(false);
                                                                    const region = BODY_REGIONS.find(r => r.region_id === entry.region_id);
                                                                    if (region) {
                                                                        setSelectedRegion(region);
                                                                        setEditingEntry(entry);
                                                                    }
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                                            <div className="p-3 bg-slate-100 rounded-full mb-3">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">No observations recorded yet</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
