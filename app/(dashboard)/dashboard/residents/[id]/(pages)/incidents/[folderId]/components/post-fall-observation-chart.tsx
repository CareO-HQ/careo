"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Clock,
    Plus,
    Save,
    FileText,
    AlertCircle,
    CheckCircle2,
    Calendar,
    User,
    Signature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ObservationEntry {
    id: string;
    interval: string;
    actualTime: string;
    painAssessed: string; // v, NA, S
    offeredToilet: string; // v, NA, S
    reach: string; // v, NA, S
    woundsBruising: string;
    headInjuryResidential: string; // ACVPU: A, C, V, P, U
    headInjuryNursing: string; // GCS score
    comments: string;
    signature: string;
    timestamp: string;
}

type PostFallObservationChartProps = {
    folderId: string;
    residentId: string;
    residentName?: string;
    residentDOB?: string;
    hcNumber?: string;
    savedReport?: any;
    onSaved?: () => void;
    orgLogoUrl?: string;
};

const INTERVAL_OPTIONS = [
    "ASAP",
    "1/2 hour later",
    "1 hour later",
    "2 hours later",
    "4 hours later",
    "8 hours later",
    "12 hours later",
    "24 hours later",
    "Custom"
];

const SIGN_OPTIONS = [
    { label: "✓", value: "v" },
    { label: "N/A", value: "NA" },
    { label: "S", value: "S" }
];

const ACVPU_OPTIONS = [
    { label: "A-Alert", value: "A" },
    { label: "C-Confusion", value: "C" },
    { label: "V-Responds only to voice", value: "V" },
    { label: "P-Responds only to pain", value: "P" },
    { label: "U-Unconscious", value: "U" }
];

export function PostFallObservationChart({
    folderId,
    residentId,
    residentName,
    residentDOB,
    hcNumber,
    savedReport,
    onSaved,
    orgLogoUrl
}: PostFallObservationChartProps) {
    const { profile } = useProfile();
    const [entries, setEntries] = useState<ObservationEntry[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // New Entry Form State
    const [newEntry, setNewEntry] = useState<Partial<ObservationEntry>>({
        interval: "ASAP",
        actualTime: format(new Date(), "HH:mm"),
        painAssessed: "v",
        offeredToilet: "v",
        reach: "v",
        headInjuryResidential: "A",
        headInjuryNursing: "",
        woundsBruising: "No change",
        comments: "",
        signature: profile?.name || ""
    });

    useEffect(() => {
        if (savedReport?.report_data?.entries) {
            setEntries(savedReport.report_data.entries);
        }
    }, [savedReport]);

    useEffect(() => {
        if (profile?.name && !newEntry.signature) {
            setNewEntry(prev => ({ ...prev, signature: profile.name as string }));
        }
    }, [profile, newEntry.signature]);

    const handleAddEntry = async () => {
        if (!newEntry.signature) {
            toast.error("Signature is required");
            return;
        }

        setIsSaving(true);
        try {
            const entry: ObservationEntry = {
                ...newEntry as ObservationEntry,
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString()
            };

            const updatedEntries = [...entries, entry];

            const { error } = await supabase
                .from("trust_incident_reports")
                .upsert({
                    id: savedReport?.id || crypto.randomUUID(),
                    folder_id: folderId,
                    resident_id: residentId,
                    trust_name: "Generic",
                    report_type: "post-fall-observation",
                    report_data: { entries: updatedEntries },
                    updated_at: new Date().toISOString(),
                    created_by: profile?.id
                });

            if (error) throw error;

            setEntries(updatedEntries);
            toast.success("Observation saved successfully");

            // Reset form for next entry
            setNewEntry(prev => ({
                ...prev,
                interval: "Custom",
                actualTime: format(new Date(), "HH:mm"),
                comments: "",
            }));

            if (onSaved) onSaved();
        } catch (error: any) {
            console.error("Error saving observation:", error);
            toast.error("Failed to save observation");
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = async () => {
        setIsDownloading(true);
        try {
            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            let y = 35;

            // Helper to load images
            const loadImage = (src: string): Promise<HTMLImageElement> => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                });
            };

            // --- Header & Green Border ---
            const headerHeight = 25;
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, headerHeight, 'F');

            // Green bottom border line
            doc.setFillColor(34, 197, 94); // #22c55e green
            doc.rect(0, headerHeight - 2, pageWidth, 1, 'F');

            // Title
            doc.setTextColor(31, 41, 55);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("24-HOUR POST-FALL OBSERVATION CHART (FORM C)", margin, 16);

            // Org Logo
            if (orgLogoUrl) {
                try {
                    const logoImg = await loadImage(orgLogoUrl);
                    const canvas = document.createElement('canvas');
                    canvas.width = logoImg.naturalWidth;
                    canvas.height = logoImg.naturalHeight;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(logoImg, 0, 0);
                    const logoDataUrl = canvas.toDataURL('image/png');
                    const logoSize = 15;
                    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
                    const logoW = logoSize * aspect;
                    doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, (headerHeight - logoSize) / 2, logoW, logoSize);
                } catch (e) {
                    console.warn("Logo load failed", e);
                }
            }

            // Section helper
            const addSectionTitle = (title: string, yPos: number) => {
                doc.setFillColor(243, 244, 246);
                doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
                doc.setDrawColor(34, 197, 94); // Green left accent
                doc.setLineWidth(1);
                doc.line(margin, yPos, margin, yPos + 8);
                doc.setTextColor(31, 41, 55);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(title.toUpperCase(), margin + 4, yPos + 5.5);
                doc.setTextColor(0, 0, 0);
                return yPos + 12;
            };

            // Resident Info Section
            y = addSectionTitle("Resident Information", y);

            autoTable(doc, {
                startY: y,
                body: [
                    ["Name of resident", residentName || "N/A", "H&C number", hcNumber || "N/A"],
                    ["Date of birth", residentDOB ? format(new Date(residentDOB), "dd/MM/yyyy") : "N/A", "Date of fall", savedReport?.created_at ? format(new Date(savedReport.created_at), "dd/MM/yyyy") : "N/A"],
                ],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    1: { cellWidth: 100 },
                    2: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    3: { cellWidth: 100 },
                }
            });
            y = (doc as any).lastAutoTable.finalY + 8;

            // Instructions Section
            y = addSectionTitle("Instructions", y);

            const instructions = [
                ["1. Observations must be completed for ALL residents who have fallen."],
                ["2. Frequency: ASAP, then every 30 mins for 1 hour, then hourly for 4 hours, then 4 hourly for 24 hours."],
                ["3. If any concerns (GCS < 15, ACVPU change, vomiting, etc.), seek urgent medical review (GP/999)."],
                ["4. Legend: \u2713 = Checked/Done, NA = Not Applicable, S = See Comments"]
            ];

            autoTable(doc, {
                startY: y,
                body: instructions,
                theme: 'plain',
                styles: {
                    fontSize: 8.5,
                    cellPadding: 2,
                    textColor: [31, 41, 55],
                    font: "helvetica",
                    fontStyle: "normal"
                },
                columnStyles: {
                    0: { cellPadding: { top: 1.5, bottom: 1.5, left: 4, right: 4 } }
                }
            });
            y = (doc as any).lastAutoTable.finalY + 8;

            // Observation Table Section
            y = addSectionTitle("Observation Records", y);

            const tableData = entries.map(e => [
                e.interval,
                e.actualTime,
                e.painAssessed,
                e.offeredToilet,
                e.reach,
                e.woundsBruising,
                e.headInjuryResidential,
                e.headInjuryNursing || "N/A",
                e.comments,
                e.signature
            ]);

            autoTable(doc, {
                startY: y,
                head: [[
                    "Interval",
                    "Actual Time",
                    "Pain",
                    "Toilet",
                    "Reach",
                    "Wounds/Bruising",
                    "ACVPU",
                    "GCS",
                    "Comments",
                    "Sign"
                ]],
                body: tableData,
                theme: "grid",
                headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 35 },
                    6: { cellWidth: 15, halign: 'center' },
                    7: { cellWidth: 15, halign: 'center' },
                    8: { cellWidth: 'auto' },
                    9: { cellWidth: 25 }
                }
            });

            doc.save(`Post-Fall-Observation-${residentName?.replace(/\s+/g, '-')}-${format(new Date(), "ddMMyyyy")}.pdf`);
            toast.success("PDF generated successfully");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        24-hour Post-Fall Observation Chart
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Record and monitor resident status following a fall event.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={generatePDF}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                    <FileText className="w-4 h-4" />
                    Export PDF
                </Button>
            </div>

            <Card className="border-emerald-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 py-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-800">
                        <Plus className="w-4 h-4" />
                        Add New Observation
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">Observation Interval</Label>
                            <Select
                                value={newEntry.interval}
                                onValueChange={(v) => setNewEntry(prev => ({ ...prev, interval: v }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INTERVAL_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">Actual Time</Label>
                            <Input
                                type="time"
                                className="h-9"
                                value={newEntry.actualTime}
                                onChange={(e) => setNewEntry(prev => ({ ...prev, actualTime: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">Pain Assessed</Label>
                            <Select
                                value={newEntry.painAssessed}
                                onValueChange={(v) => setNewEntry(prev => ({ ...prev, painAssessed: v }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SIGN_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">Offered Toilet</Label>
                            <Select
                                value={newEntry.offeredToilet}
                                onValueChange={(v) => setNewEntry(prev => ({ ...prev, offeredToilet: v }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SIGN_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">Items in Reach</Label>
                            <Select
                                value={newEntry.reach}
                                onValueChange={(v) => setNewEntry(prev => ({ ...prev, reach: v }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SIGN_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label className="text-xs font-bold text-gray-600">Wounds/Bruising Check</Label>
                            <Input
                                className="h-9"
                                placeholder="Any visible marks?"
                                value={newEntry.woundsBruising}
                                onChange={(e) => setNewEntry(prev => ({ ...prev, woundsBruising: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">ACVPU Score</Label>
                            <Select
                                value={newEntry.headInjuryResidential}
                                onValueChange={(v) => setNewEntry(prev => ({ ...prev, headInjuryResidential: v }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACVPU_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-600">GCS Score (Nursing)</Label>
                            <Input
                                className="h-9"
                                placeholder="Score /15"
                                value={newEntry.headInjuryNursing}
                                onChange={(e) => setNewEntry(prev => ({ ...prev, headInjuryNursing: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2 col-span-full">
                            <Label className="text-xs font-bold text-gray-600">Comments & Additional Information</Label>
                            <Textarea
                                placeholder="Record any relevant details or concerns..."
                                className="min-h-[80px]"
                                value={newEntry.comments}
                                onChange={(e) => setNewEntry(prev => ({ ...prev, comments: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2 lg:col-start-4">
                            <Label className="text-xs font-bold text-gray-600">Signature</Label>
                            <Input
                                className="h-9 italic font-serif"
                                value={newEntry.signature}
                                onChange={(e) => setNewEntry(prev => ({ ...prev, signature: e.target.value }))}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                onClick={handleAddEntry}
                                disabled={isSaving}
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? "Saving..." : "Save Observation"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b py-3 px-6">
                    <CardTitle className="text-sm font-semibold text-gray-700">Observation History</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b uppercase text-[10px] font-bold">
                            <tr>
                                <th className="px-6 py-3">Interval</th>
                                <th className="px-6 py-3">Actual Time</th>
                                <th className="px-6 py-3">Pain</th>
                                <th className="px-6 py-3">Toilet</th>
                                <th className="px-6 py-3">Reach</th>
                                <th className="px-6 py-3">Wounds</th>
                                <th className="px-6 py-3">ACVPU</th>
                                <th className="px-6 py-3">GCS</th>
                                <th className="px-6 py-3">Comments</th>
                                <th className="px-6 py-3">Signature</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                                        No observations recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                [...entries].reverse().map((e) => (
                                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{e.interval}</td>
                                        <td className="px-6 py-4 text-gray-600">{e.actualTime}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.painAssessed === 'v' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {e.painAssessed === 'v' ? '✓' : e.painAssessed}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.offeredToilet === 'v' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {e.offeredToilet === 'v' ? '✓' : e.offeredToilet}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.reach === 'v' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {e.reach === 'v' ? '✓' : e.reach}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-[150px] truncate" title={e.woundsBruising}>
                                            {e.woundsBruising}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                                {e.headInjuryResidential}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">{e.headInjuryNursing || "-"}</td>
                                        <td className="px-6 py-4 text-gray-600" title={e.comments}>
                                            <div className="max-w-[200px] truncate">{e.comments || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4 italic text-gray-500 font-serif">{e.signature}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
