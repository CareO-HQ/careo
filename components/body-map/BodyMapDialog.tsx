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
import { BodyRegion, BodyMapEntry, BodyMapData } from "@/types/body-map";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BODY_REGIONS } from "@/lib/config/body-regions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BodyMapDialogProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId: string;
    residentName?: string;
    incidentDate?: string;
    incidentType?: string;
    initialData?: BodyMapData;
    onSave?: (data: BodyMapData) => void;
}

export function BodyMapDialog({
    isOpen,
    onClose,
    incidentId,
    residentName,
    incidentDate,
    incidentType,
    initialData = { entries: [] },
    onSave
}: BodyMapDialogProps) {
    const [data, setData] = React.useState<BodyMapData>(initialData);
    const [selectedRegion, setSelectedRegion] = React.useState<BodyRegion | null>(null);
    const [editingEntry, setEditingEntry] = React.useState<BodyMapEntry | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [viewMode, setViewMode] = React.useState(false); // Default to edit mode since toggle is removed

    const handleDownloadPDF = async () => {
        if (!data.entries || data.entries.length === 0) {
            toast.error("No entries to download");
            return;
        }

        setIsDownloading(true);
        try {
            // Initialize jsPDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const margin = 14;

            // --- Header ---
            doc.setFillColor(0, 94, 184); // #005eb8 NHS Blue
            doc.rect(0, 0, pageWidth, 20, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Body Mapping Documentation", margin, 13);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const rightText = (text: string, y: number) => {
                const textWidth = doc.getTextWidth(text);
                doc.text(text, pageWidth - margin - textWidth, y);
            };
            rightText("Confidential Medical Record", 13);

            // --- Resident & Incident Info ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let yPos = 30;
            const lineHeight = 6;

            doc.setFont("helvetica", "bold");
            doc.text("Resident Information", margin, yPos);
            yPos += lineHeight + 2;

            doc.setFont("helvetica", "normal");
            doc.text(`Resident: ${residentName || "N/A"}`, margin, yPos);
            doc.text(`Incident Type: ${incidentType || "N/A"}`, pageWidth / 2, yPos);
            yPos += lineHeight;
            doc.text(`Incident Date: ${incidentDate || "N/A"}`, margin, yPos);
            doc.text(`Report Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth / 2, yPos);
            yPos += 10;

            // --- Body Map Image & Markers ---
            doc.setFont("helvetica", "bold");
            doc.text("Anatomical Distribution", margin, yPos);
            yPos += 5;

            // Define map dimensions on PDF
            const mapWidth = 140;
            const mapHeight = (mapWidth * 515) / 577; // Maintain aspect ratio
            const mapX = (pageWidth - mapWidth) / 2;
            const mapY = yPos;

            // Draw Background Rectangle for the map
            doc.setDrawColor(226, 232, 240);
            doc.rect(mapX, mapY, mapWidth, mapHeight);

            // Add the image
            const imgPath = "/images/body_template_without_rectangular_boxes.png";
            // We need to use base64 or a loaded image for jsPDF
            // Since this is client-side, we can fetch it or use the already loaded image in the DOM

            const loadImage = (src: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            };

            const img = await loadImage(imgPath);
            doc.addImage(img, 'PNG', mapX, mapY, mapWidth, mapHeight);

            // Draw Markers
            data.entries.forEach(entry => {
                const region = BODY_REGIONS.find(r => r.region_id === entry.region_id);
                if (region) {
                    const isResolved = String(entry.status).toLowerCase() === "resolved";

                    // Convert percentage coordinates to PDF coordinates
                    const rectX = mapX + (region.x * mapWidth) / 100;
                    const rectY = mapY + (region.y * mapHeight) / 100;
                    const rectW = (region.width * mapWidth) / 100;
                    const rectH = (region.height * mapHeight) / 100;

                    // Set marker style
                    if (isResolved) {
                        doc.setFillColor(34, 197, 94); // #22c55e Green
                        doc.setDrawColor(34, 197, 94);
                        doc.setGState(new (doc as any).GState({ opacity: 0.2 }));
                    } else {
                        doc.setFillColor(168, 85, 247); // #a855f7 Purple
                        doc.setDrawColor(147, 51, 234);
                        doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
                    }

                    doc.rect(rectX, rectY, rectW, rectH, 'F');
                    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
                    doc.rect(rectX, rectY, rectW, rectH, 'S');
                }
            });

            yPos = mapY + mapHeight + 15;

            // --- Clinical Observations Table ---
            doc.setFont("helvetica", "bold");
            doc.text("Clinical Observations", margin, yPos);
            yPos += 5;

            const tableData = data.entries.map(entry => [
                entry.region_name,
                entry.condition_type,
                `${entry.notes || ""}${entry.measurements ? `\nSize: ${entry.measurements}` : ""}`,
                entry.date_time ? new Date(entry.date_time).toLocaleDateString("en-GB") : "N/A"
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Region', 'Observation Type', 'Notes & Measurements', 'Recorded Date']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [51, 65, 85],
                    fontStyle: 'bold',
                    lineWidth: 0.1
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 30 }
                }
            });

            // --- Footer ---
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.text(`Generated by CareO System on ${new Date().toLocaleString("en-GB")}`, margin, doc.internal.pageSize.height - 10);
            doc.text(`Confidential Medical Record`, pageWidth - margin - doc.getTextWidth(`Confidential Medical Record`), doc.internal.pageSize.height - 10);

            // Save the PDF
            doc.save(`body-map-${residentName?.replace(/\s+/g, "-") || "report"}-${new Date().toISOString().split("T")[0]}.pdf`);

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
            setData(initialData);
        }
    }, [initialData]);

    const handleRegionClick = (region: BodyRegion) => {
        setSelectedRegion(region);
        // Find the first active entry for this region if it exists
        // fallback to search without status if explicitly "active" is not found (for legacy data)
        const existing = data.entries.find(e => e.region_id === region.region_id && e.status === "active")
            || data.entries.find(e => e.region_id === region.region_id);
        setEditingEntry(existing || null);
    };

    const handleSubmitEntry = async (formData: any) => {
        if (!selectedRegion) return;

        let newEntries = [...data.entries];

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
                ...formData
            };
            newEntries.push(newEntry);
        }

        const newData = { entries: newEntries };
        await saveToSupabase(newData);
    };

    const handleDeleteEntry = async () => {
        if (!editingEntry) return;

        const newData = {
            entries: data.entries.filter(e => e.id !== editingEntry.id)
        };
        await saveToSupabase(newData);
    };

    const saveToSupabase = async (newData: BodyMapData) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("incidents")
                .update({ body_map_data: newData })
                .eq("id", incidentId);

            if (error) throw error;

            setData(newData);
            setSelectedRegion(null);
            setEditingEntry(null);
            toast.success("Body map updated");
            onSave?.(newData);
        } catch (err) {
            console.error("Error saving body map:", err);
            toast.error("Failed to save body map");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[1300px] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden text-slate-900 border-none shadow-2xl">
                <DialogHeader className="p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle>Body Mapping - Medical Documentation</DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading || data.entries.length === 0}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md border",
                                isDownloading || data.entries.length === 0
                                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
                            )}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                            {isDownloading ? "Generating..." : "Download PDF"}
                        </button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-row">
                    {/* Left: Body Map Area */}
                    <div className="flex-[3] p-6 overflow-hidden bg-white border-r border-slate-200">
                        <div className="flex justify-center h-full items-center">
                            <InteractiveBodyMap
                                entries={data.entries}
                                onRegionClick={(region) => {
                                    if (!viewMode) handleRegionClick(region);
                                }}
                                isLoading={isSaving}
                                selectedRegionId={selectedRegion?.region_id}
                                viewMode={viewMode}
                            />
                        </div>
                    </div>

                    {/* Right: Form Area / Summary */}
                    <div className="flex-[2] overflow-hidden bg-slate-50/50 relative">
                        <ScrollArea className="h-full px-6 py-6">
                            {selectedRegion ? (
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

                                    {data.entries.length > 0 ? (
                                        <div className="space-y-3">
                                            {data.entries.map((entry) => (
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
