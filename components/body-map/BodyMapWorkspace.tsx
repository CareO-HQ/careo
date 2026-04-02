"use client";

import React from "react";
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
    X,
    Download,
    Plus,
    Clock,
    Edit2,
    Trash2,
    Pencil,
} from "lucide-react";

interface BodyMapWorkspaceProps {
    incidentId?: string;
    residentName?: string;
    incidentDate?: string;
    incidentType?: string;
    initialData?: BodyMapData;
    onSave?: (data: BodyMapData) => void | Promise<void>;
    orgLogoUrl?: string;
    simpleMode?: boolean;
    onClose?: () => void;
}

export function BodyMapWorkspace({
    incidentId,
    residentName,
    incidentDate,
    incidentType,
    initialData,
    onSave,
    orgLogoUrl,
    simpleMode = false,
    onClose,
}: BodyMapWorkspaceProps) {
    const [data, setData] = React.useState<BodyMapData>(() =>
        normalizeBodyMapData(initialData, incidentDate)
    );
    const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = React.useState<BodyRegion | null>(null);
    const [editingEntry, setEditingEntry] = React.useState<BodyMapEntry | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [viewMode, setViewMode] = React.useState(false);
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState("");

    const currentSession = data.sessions.find((s) => s.id === currentSessionId);

    /* ───── sync with initialData prop ───── */
    React.useEffect(() => {
        if (initialData) {
            const normalized = normalizeBodyMapData(initialData, incidentDate);
            setData(normalized);
            if (!currentSessionId && normalized.sessions.length > 0) {
                setCurrentSessionId(normalized.sessions[0].id);
            }
        }
    }, [initialData, incidentId, incidentDate]);

    /* ───── auto-create session in simpleMode ───── */
    const saveToSupabase = React.useCallback(
        async (newData: BodyMapData, skipOnSave = false) => {
            setIsSaving(true);
            try {
                if (incidentId) {
                    const { error } = await supabase
                        .from("incidents")
                        .update({ body_map_data: newData })
                        .eq("id", incidentId);
                    if (error) throw error;
                }
                if (onSave && !skipOnSave) await onSave(newData);
                setData(newData);
                setSelectedRegion(null);
                setEditingEntry(null);
                if (!skipOnSave) toast.success("Body map saved");
            } catch (err) {
                console.error(err);
                if (!skipOnSave) toast.error("Failed to save body map");
            } finally {
                setIsSaving(false);
            }
        },
        [incidentId, onSave]
    );

    const handleCreateSession = React.useCallback(
        async (skipOnSave = false) => {
            const newSession: BodyMapSession = {
                id: uuidv4(),
                date: new Date().toISOString().split("T")[0],
                label: `Session ${data.sessions.length + 1}`,
                entries: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const newData = { sessions: [...data.sessions, newSession] };
            await saveToSupabase(newData, skipOnSave);
            setCurrentSessionId(newSession.id);
        },
        [data.sessions, saveToSupabase]
    );

    React.useEffect(() => {
        if (!simpleMode) return;
        if (data.sessions.length === 0 && !currentSessionId) {
            void handleCreateSession(true);
        } else if (data.sessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(data.sessions[0].id);
        }
    }, [simpleMode, data.sessions.length, currentSessionId, handleCreateSession]);

    /* ───── region click ───── */
    const handleRegionClick = (region: BodyRegion) => {
        if (!currentSession) {
            toast.error("Please create a session first");
            return;
        }
        const existing =
            currentSession.entries.find(
                (e) => e.region_id === region.region_id && e.status === "active"
            ) || currentSession.entries.find((e) => e.region_id === region.region_id);
        setSelectedRegion(region);
        setEditingEntry(existing || null);
        setViewMode(false);
    };

    /* ───── save entry ───── */
    const handleSubmitEntry = async (formData: any) => {
        if (!selectedRegion || !currentSession) return;
        const now = new Date().toISOString();
        let newEntries = [...currentSession.entries];
        if (editingEntry) {
            newEntries = newEntries.map((e) =>
                e.id === editingEntry.id ? { ...e, ...formData } : e
            );
        } else {
            newEntries.push({
                id: uuidv4(),
                region_id: selectedRegion.region_id,
                region_name: selectedRegion.region_name,
                status: "active",
                ...formData,
                date_time: formData.date_time || now,
            } as BodyMapEntry);
        }
        const entryTime = formData.date_time || now;
        const newSessions = data.sessions.map((s) =>
            s.id === currentSessionId
                ? { ...s, entries: newEntries, created_at: entryTime, date: entryTime.split("T")[0], updated_at: now }
                : s
        );
        await saveToSupabase({ sessions: newSessions });
    };

    /* ───── delete entry ───── */
    const handleDeleteEntry = async () => {
        if (!editingEntry || !currentSession) return;
        const newEntries = currentSession.entries.filter((e) => e.id !== editingEntry.id);
        const now = new Date().toISOString();
        const newSessions = data.sessions.map((s) => {
            if (s.id !== currentSessionId) return s;
            const latest = [...newEntries].sort(
                (a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
            )[0];
            return {
                ...s,
                entries: newEntries,
                created_at: latest?.date_time ?? s.created_at,
                date: latest?.date_time.split("T")[0] ?? s.date,
                updated_at: now,
            };
        });
        await saveToSupabase({ sessions: newSessions });
    };

    /* ───── PDF ───── */
    const handleDownloadPDF = async () => {
        if (!currentSession?.entries.length) {
            toast.error("No entries to export");
            return;
        }
        setIsDownloading(true);
        try {
            await generateBodyMapPDF({ residentName, incidentDate, incidentType, currentSession, orgLogoUrl });
            toast.success("PDF generated");
        } catch {
            toast.error("PDF generation failed");
        } finally {
            setIsDownloading(false);
        }
    };

    /* ───── delete observation card button ───── */
    const handleDeleteEntryById = async (entryId: string) => {
        if (!currentSession) return;
        const newEntries = currentSession.entries.filter((e) => e.id !== entryId);
        const now = new Date().toISOString();
        const newSessions = data.sessions.map((s) => {
            if (s.id !== currentSessionId) return s;
            return { ...s, entries: newEntries, updated_at: now };
        });
        await saveToSupabase({ sessions: newSessions });
        if (editingEntry?.id === entryId) {
            setSelectedRegion(null);
            setEditingEntry(null);
        }
    };

    /* ───── rename session label ───── */
    const handleRenameSession = React.useCallback(async () => {
        const trimmed = tempName.trim();
        if (!trimmed || !currentSession) { setIsEditingName(false); return; }
        const updatedSessions = data.sessions.map((s) =>
            s.id === currentSessionId
                ? { ...s, label: trimmed, updated_at: new Date().toISOString() }
                : s
        );
        await saveToSupabase({ sessions: updatedSessions }, false);
        setIsEditingName(false);
    }, [tempName, currentSession, currentSessionId, data.sessions, saveToSupabase]);

    const entries = currentSession?.entries ?? [];
    const mapName = currentSession?.label ?? "Body Map";

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                <div>
                    <div className="flex items-center gap-2 group/title">
                        {isEditingName ? (
                            <input
                                autoFocus
                                className="text-xl font-bold text-slate-900 leading-tight bg-transparent border-b-2 border-primary outline-none w-56"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={handleRenameSession}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSession();
                                    if (e.key === "Escape") setIsEditingName(false);
                                }}
                            />
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-slate-900 leading-tight">{mapName}</h2>
                                <button
                                    className="p-0.5 rounded text-slate-300 hover:text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                    onClick={() => { setTempName(mapName); setIsEditingName(true); }}
                                    title="Rename body map"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                    {(incidentDate || currentSession) && (
                        <p className="text-sm text-slate-500 mt-0.5">
                            {currentSession
                                ? new Date(currentSession.date).toLocaleDateString("en-GB")
                                : new Date(incidentDate!).toLocaleDateString("en-GB")}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 h-9 text-slate-600 border-slate-200 hover:bg-slate-50"
                        onClick={handleDownloadPDF}
                        disabled={isDownloading || !entries.length}
                    >
                        <Download className="w-4 h-4" />
                        {isDownloading ? "Generating…" : "Download PDF"}
                    </Button>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-hidden flex min-h-0">
                {/* Left – Body Map */}
                <div className="flex-[6] bg-slate-50 flex items-center justify-center p-6 overflow-hidden min-w-0">
                    {currentSession ? (
                        <InteractiveBodyMap
                            entries={entries}
                            onRegionClick={(r) => { if (!viewMode) handleRegionClick(r); }}
                            isLoading={isSaving}
                            selectedRegionId={selectedRegion?.region_id}
                            viewMode={viewMode}
                        />
                    ) : (
                        <div className="text-center text-slate-400">
                            <p className="text-sm">Initialising map…</p>
                        </div>
                    )}
                </div>

                {/* Right – Observations Panel */}
                <div className="flex-[4] border-l border-slate-100 flex flex-col min-w-0 bg-white overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="px-6 py-6 space-y-5">
                            {/* Panel title */}
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Recorded Observations</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Click on a region to add or view details.</p>
                            </div>

                            {/* Entry Form (when a region is selected) */}
                            {selectedRegion && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            {editingEntry ? "Edit Observation" : "New Observation"}
                                        </span>
                                        <button
                                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                                            onClick={() => { setSelectedRegion(null); setEditingEntry(null); setViewMode(false); }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                                        <BodyMapEntryForm
                                            regionName={selectedRegion.region_name}
                                            initialData={editingEntry || undefined}
                                            onSubmit={handleSubmitEntry}
                                            onCancel={() => { setSelectedRegion(null); setEditingEntry(null); setViewMode(false); }}
                                            onDelete={editingEntry ? handleDeleteEntry : undefined}
                                            readOnly={viewMode}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Observations list / empty state */}
                            {entries.length === 0 && !selectedRegion ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center">
                                    <div className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center mb-3">
                                        <Plus className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500">No observations recorded yet</p>
                                </div>
                            ) : entries.length > 0 ? (
                                <div className="space-y-3">
                                    {entries
                                        .slice()
                                        .sort(
                                            (a, b) =>
                                                new Date(b.date_time).getTime() -
                                                new Date(a.date_time).getTime()
                                        )
                                        .map((entry) => (
                                            <ObservationCard
                                                key={entry.id}
                                                entry={entry}
                                                isActive={editingEntry?.id === entry.id}
                                                onEdit={() => {
                                                    const r = BODY_REGIONS.find(
                                                        (reg) => reg.region_id === entry.region_id
                                                    );
                                                    if (r) {
                                                        setSelectedRegion(r);
                                                        setEditingEntry(entry);
                                                        setViewMode(false);
                                                    }
                                                }}
                                                onDelete={() => handleDeleteEntryById(entry.id)}
                                            />
                                        ))}
                                </div>
                            ) : null}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

/* ── Observation Card ── */
interface ObservationCardProps {
    entry: BodyMapEntry;
    isActive: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

function ObservationCard({ entry, isActive, onEdit, onDelete }: ObservationCardProps) {
    const [confirmDelete, setConfirmDelete] = React.useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirmDelete) {
            onDelete();
        } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
        }
    };

    return (
        <div
            className={cn(
                "group rounded-xl border p-4 cursor-pointer transition-all duration-150",
                isActive
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            )}
            onClick={onEdit}
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0 mt-0.5",
                        isActive ? "bg-primary" : "bg-slate-400"
                    )} />
                    <span className="text-sm font-semibold text-slate-900 leading-tight break-words">
                        {entry.region_name}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        className={cn(
                            "p-1 rounded transition-colors",
                            confirmDelete
                                ? "text-red-500 bg-red-50 hover:bg-red-100"
                                : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                        )}
                        onClick={handleDelete}
                        title={confirmDelete ? "Click again to confirm" : "Delete"}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Type badge + time */}
            <div className="flex items-center gap-2 mb-2 ml-4">
                <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {entry.condition_type}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            {/* Notes (full text, no clipping) */}
            {entry.notes && (
                <div className="ml-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-700 italic leading-relaxed whitespace-pre-wrap break-words">
                        {entry.notes}
                    </p>
                </div>
            )}

            {/* Measurements / Assessed by */}
            {(entry.measurements || entry.assessed_by) && (
                <div className="ml-4 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 pt-2 border-t border-slate-50">
                    {entry.measurements && <span className="break-words">Dimensions: {entry.measurements}</span>}
                    {entry.assessed_by && <span className="break-words">Assessed by: {entry.assessed_by}</span>}
                </div>
            )}
        </div>
    );
}
