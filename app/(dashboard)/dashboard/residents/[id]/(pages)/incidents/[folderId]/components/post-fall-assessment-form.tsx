"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Download, Printer, AlertTriangle, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { IncidentTimeSelect } from "@/components/incidents/incident-time-select";
import { formatIncidentTimeDisplay } from "@/lib/incident-time-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useProfile } from "@/hooks/use-profile";

interface PostFallAssessmentFormProps {
    folderId: string;
    residentId: string;
    residentName?: string;
    onSaved?: () => void;
    savedReport?: Record<string, any>;
    orgLogoUrl?: string;
}

export function PostFallAssessmentForm({
    folderId,
    residentId,
    residentName: prefillResidentName,
    onSaved,
    savedReport,
    orgLogoUrl,
}: PostFallAssessmentFormProps) {
    const { profile } = useProfile();
    const isRqiaView = profile?.role === "rqia";
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isViewMode, setIsViewMode] = useState(!!savedReport);
    const [residentData, setResidentData] = useState<any>(null);

    // ... existing formData state ...
    const [formData, setFormData] = useState({
        // Header
        residentName: prefillResidentName || "",
        hcNumber: "",
        dateOfFall: "",
        timeOfFall: "",
        locationOfFall: "",
        completedBy: "",

        // Initial Assessment
        levelOfConsciousness: "", // 'responsive', 'less_responsive', 'unresponsive'
        painOrDiscomfort: "", // 'no_evidence', 'signs_of_new_pain'
        painLocation: "",
        injuryOrWounds: "", // 'no_evidence', 'evidence_of_swelling'
        injuryLocation: "",
        movementAndMobility: "", // 'able_usual', 'able_new_pain', 'unable_usual'
        observations: "",

        // Vitals
        heartRate: "",
        bpLying: "",
        bpStanding: "",
        bloodSugar: "",
        respiratoryRate: "",
        oxygenSaturations: "",
        neuroObsGcs: "",
        temperature: "",

        // Conclusion (24hrs post fall)
        conclusionType: "", // 'no_injury', 'minor_injury', 'serious_injury'
        conclusionChecklist: [] as string[],

        // Footer
        footerName: "",
        footerSignature: "",
        footerDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        footerDesignation: "",

        // NIAS Details
        niasTime: "",
        niasOutcome: "", // 'remained_in_home', 'transferred_to_ed'
    });

    useEffect(() => {
        const fetchResident = async () => {
            if (!residentId) return;
            const { data, error } = await supabase
                .from("residents")
                .select("first_name, last_name, nhs_health_number")
                .eq("id", residentId)
                .single();
            if (!error && data) {
                setResidentData(data);
                setFormData(prev => ({
                    ...prev,
                    residentName: `${data.first_name} ${data.last_name}`,
                    hcNumber: data.nhs_health_number || "",
                }));
            }
        };
        fetchResident();
    }, [residentId]);

    useEffect(() => {
        if (savedReport) {
            setFormData(prev => ({
                ...prev,
                ...savedReport
            }));
            setIsViewMode(true);
        } else if (profile?.name) {
            // New report: prefill with current user name
            setFormData(prev => ({
                ...prev,
                completedBy: profile.name || "",
                footerName: profile.name || "",
                footerDesignation: profile.role || ""
            }));
        }
    }, [savedReport, profile]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleChecklistToggle = (item: string) => {
        setFormData(prev => {
            const current = prev.conclusionChecklist || [];
            if (current.includes(item)) {
                // If unchecking "NIAS called", clear NIAS details
                if (item === "NIAS called") {
                    return {
                        ...prev,
                        conclusionChecklist: current.filter(i => i !== item),
                        niasTime: "",
                        niasOutcome: ""
                    };
                }
                return { ...prev, conclusionChecklist: current.filter(i => i !== item) };
            }
            return { ...prev, conclusionChecklist: [...current, item] };
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                folder_id: folderId,
                resident_id: residentId,
                trust_name: "Generic",
                report_type: "post-fall-assessment",
                report_data: {
                    ...formData,
                    status: "submitted",
                }
            };

            if (savedReport?.id) {
                const { error } = await supabase
                    .from("trust_incident_reports")
                    .update(payload)
                    .eq("id", savedReport.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("trust_incident_reports")
                    .insert(payload);
                if (error) throw error;
            }

            toast.success("Assessment saved successfully");
            setIsViewMode(true);
            onSaved?.();
        } catch (error) {
            console.error("Error saving assessment:", error);
            toast.error("Failed to save assessment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generatePDF = async () => {
        setIsDownloading(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
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
            doc.text("POST-FALL ASSESSMENT", margin, 16);

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
                    ["Name of resident", formData.residentName, "H&C number", formData.hcNumber],
                    ["Date of fall", formData.dateOfFall || "N/A", "Time of fall", formData.timeOfFall || "N/A"],
                    ["Location of fall", formData.locationOfFall || "N/A", "Name/designation of person completing form", formData.completedBy || "N/A"],
                ],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    1: { cellWidth: 50 },
                    2: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    3: { cellWidth: 50 },
                }
            });
            y = (doc as any).lastAutoTable.finalY + 10;

            // Initial Assessment Section
            y = addSectionTitle("Initial Assessment", y);

            const assessmentData = [
                ["Level of consciousness", "Responsive as usual\nLess responsive than usual\nUnresponsive or unconscious",
                    formData.levelOfConsciousness === 'responsive' ? '✓' : formData.levelOfConsciousness === 'less_responsive' ? '✓' : formData.levelOfConsciousness === 'unresponsive' ? '✓' : ""],
                ["Pain or discomfort", "No evidence of new pain or discomfort\nShowing signs of new pain or complaining of new pain\nWhere is the pain? " + (formData.painLocation || "N/A"),
                    formData.painOrDiscomfort === 'no_evidence' ? '✓' : formData.painOrDiscomfort === 'signs_of_new_pain' ? '✓' : ""],
                ["Injury or wounds", "No evidence of injury, bleeding or wounds\nEvidence of swelling, bruising, bleeding or deformity\nWhere is the injury or wound/s? " + (formData.injuryLocation || "N/A"),
                    formData.injuryOrWounds === 'no_evidence' ? '✓' : formData.injuryOrWounds === 'signs_of_new_pain' ? '✓' : ""],
                ["Movement and mobility", "Able to move all limbs as usual and has no new pain\nAble to move limbs but has new pain on movement\nUnable to move limbs as usual or major change in mobility",
                    formData.movementAndMobility === 'able_usual' ? '✓' : formData.movementAndMobility === 'able_new_pain' ? '✓' : formData.movementAndMobility === 'unable_usual' ? '✓' : ""],
            ];

            autoTable(doc, {
                startY: y,
                body: assessmentData,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    1: { cellWidth: 120 },
                    2: { cellWidth: 20, halign: 'center' },
                }
            });
            y = (doc as any).lastAutoTable.finalY + 5;

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Observations:", margin, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            const obsText = doc.splitTextToSize(formData.observations || "None", pageWidth - (margin * 2));
            doc.text(obsText, margin, y);
            y += (obsText.length * 5) + 8;

            // Vital Signs Section
            y = addSectionTitle("Vital Signs", y);

            autoTable(doc, {
                startY: y,
                body: [
                    ["Heart Rate", formData.heartRate || "N/A", "BP (Lying)", formData.bpLying || "N/A", "Blood sugar", formData.bloodSugar || "N/A", "RR", formData.respiratoryRate || "N/A"],
                    ["O2 Saturation", formData.oxygenSaturations || "N/A", "BP (Standing)", formData.bpStanding || "N/A", "GCS score", formData.neuroObsGcs || "N/A", "Temperature", formData.temperature || "N/A"],
                ],
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 25, fillColor: [250, 250, 250] },
                    1: { cellWidth: 20 },
                    2: { fontStyle: 'bold', cellWidth: 35, fillColor: [250, 250, 250] },
                    3: { cellWidth: 20 },
                    4: { fontStyle: 'bold', cellWidth: 25, fillColor: [250, 250, 250] },
                    5: { cellWidth: 20 },
                    6: { fontStyle: 'bold', cellWidth: 25, fillColor: [250, 250, 250] },
                    7: { cellWidth: 20 },
                }
            });
            y = (doc as any).lastAutoTable.finalY + 12;

            // Conclusion Section
            const checkY = (needed: number) => {
                if (y + needed > doc.internal.pageSize.height - 20) {
                    doc.addPage();
                    y = 20;
                }
            };

            checkY(15);
            y = addSectionTitle("Conclusion of assessment (24hrs post fall)", y);

            const conclusionRows: any[] = [];
            const checklist = formData.conclusionChecklist || [];

            const noInjuryItems = [
                "Assisted resident to a comfortable place",
                "Completed falls assessment tool, body map and 24 hr observation chart",
                "Informed family, named worker, GP and RQIA-if appropriate",
                "Completed all relevant paperwork"
            ];
            const minorInjuryItems = [
                "Assisted resident to a comfortable place",
                "Administered First Aid",
                "Completed falls assessment tool, body map and 24 hr observation chart",
                "Informed family, named worker, GP and RQIA-if appropriate",
                "Completed all relevant paperwork"
            ];
            const seriousInjuryItems = [
                "NIAS called",
                "Completed falls assessment tools, body map and observation chart",
                "Informed family, named worker, GP and RQIA",
                "Completed all relevant paperwork"
            ];

            const renderChecklist = (items: string[], type: string) => {
                if (formData.conclusionType !== type) return items.join("\n");
                return items.map(item => {
                    let text = (checklist.includes(item) ? "[x] " : "[ ] ") + item;
                    if (item === "NIAS called" && checklist.includes(item)) {
                        if (formData.niasTime) text += ` (Time: ${formData.niasTime})`;
                        if (formData.niasOutcome === 'remained_in_home') text += " - Remained in Home";
                        else if (formData.niasOutcome === 'transferred_to_ed') text += " - Transferred to ED";
                    }
                    return text;
                }).join("\n");
            };

            conclusionRows.push(["No obvious injury sustained", renderChecklist(noInjuryItems, 'no_injury'),
                formData.conclusionType === 'no_injury' ? "✓" : ""
            ]);
            conclusionRows.push(["Minor Injury sustained", renderChecklist(minorInjuryItems, 'minor_injury'),
                formData.conclusionType === 'minor_injury' ? "✓" : ""
            ]);
            conclusionRows.push(["Serious injury sustained", renderChecklist(seriousInjuryItems, 'serious_injury'),
                formData.conclusionType === 'serious_injury' ? "✓" : ""
            ]);

            autoTable(doc, {
                startY: y,
                body: conclusionRows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35, fillColor: [250, 250, 250] },
                    1: { cellWidth: 130 },
                    2: { cellWidth: 15, halign: 'center' },
                }
            });
            y = (doc as any).lastAutoTable.finalY + 12;

            // Footer Section
            checkY(30);
            y = addSectionTitle("Signatures", y);

            autoTable(doc, {
                startY: y,
                body: [
                    ["Print Name", formData.footerName || "N/A", "Signature", formData.footerSignature || "N/A"],
                    ["Date and Time", formData.footerDateTime ? format(new Date(formData.footerDateTime), "PPpp") : "N/A", "Designation", formData.footerDesignation || "N/A"],
                ],
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    1: { cellWidth: 50 },
                    2: { fontStyle: 'bold', cellWidth: 40, fillColor: [250, 250, 250] },
                    3: { cellWidth: 50 },
                }
            });

            doc.save(`Post-Fall-Assessment-${formData.residentName.replace(/\s+/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
            toast.success("PDF generated successfully");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    const isReadOnly = isViewMode && !isSubmitting;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-6 print:p-0">
            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm sticky top-0 z-10 print:hidden">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600" />
                        Post-fall Assessment
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isViewMode ? "Viewing saved assessment" : "Complete the post-fall assessment form"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={generatePDF} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        PDF
                    </Button>
                    {isViewMode ? (
                        !isRqiaView && (
                            <Button variant="outline" onClick={() => setIsViewMode(false)}>
                                Edit
                            </Button>
                        )
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Report
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border shadow-none print:shadow-none print:border-none">
                <CardHeader className="bg-slate-50 border-b py-6 print:bg-white text-center">
                    <CardTitle className="text-2xl font-bold text-slate-900">Form A Post-fall assessment and management tool</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {/* Header Section */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/20">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Name of resident</Label>
                                    <Input value={formData.residentName} readOnly className="bg-white border-none shadow-none px-0" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Date of fall</Label>
                                        <Input
                                            type={isReadOnly ? "text" : "date"}
                                            value={formData.dateOfFall}
                                            onChange={(e) => handleChange('dateOfFall', e.target.value)}
                                            disabled={isReadOnly}
                                            className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Time of fall</Label>
                                        {isReadOnly ? (
                                            <p className="text-sm">
                                                {formatIncidentTimeDisplay(formData.timeOfFall) || "—"}
                                            </p>
                                        ) : (
                                            <IncidentTimeSelect
                                                value={formData.timeOfFall}
                                                onChange={(value) => handleChange("timeOfFall", value)}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Location of fall</Label>
                                    <Input
                                        value={formData.locationOfFall}
                                        onChange={(e) => handleChange('locationOfFall', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">H&C number</Label>
                                    <Input value={formData.hcNumber} readOnly className="bg-white border-none shadow-none px-0" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Name/designation of person completing form</Label>
                                    <Input
                                        value={formData.completedBy}
                                        onChange={(e) => handleChange('completedBy', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Assessment Section */}
                        <div className="p-6 space-y-8">
                            <h3 className="font-bold text-lg border-b pb-2">Initial Assessment</h3>

                            <div className="grid grid-cols-1 gap-8">
                                {/* Level of consciousness */}
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Level of consciousness</Label>
                                    <RadioGroup value={formData.levelOfConsciousness} onValueChange={(v) => handleChange('levelOfConsciousness', v)} disabled={isReadOnly}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="responsive" id="lc-1" />
                                            <Label htmlFor="lc-1">Responsive as usual</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="less_responsive" id="lc-2" />
                                            <Label htmlFor="lc-2">Less responsive than usual</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="unresponsive" id="lc-3" />
                                            <Label htmlFor="lc-3">Unresponsive or unconscious</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Pain */}
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Pain or discomfort</Label>
                                    <RadioGroup value={formData.painOrDiscomfort} onValueChange={(v) => handleChange('painOrDiscomfort', v)} disabled={isReadOnly}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no_evidence" id="pd-1" />
                                            <Label htmlFor="pd-1">No evidence of new pain or discomfort</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="signs_of_new_pain" id="pd-2" />
                                            <Label htmlFor="pd-2">Showing signs of new pain or complaining of new pain</Label>
                                        </div>
                                    </RadioGroup>
                                    <div className="pl-6 space-y-2 mt-2">
                                        <Label className="text-sm text-slate-500">Where is the pain?</Label>
                                        <Input
                                            value={formData.painLocation}
                                            onChange={(e) => handleChange('painLocation', e.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Enter location..."
                                            className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                        />
                                    </div>
                                </div>

                                {/* Injury */}
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Injury or wounds (See body map)</Label>
                                    <RadioGroup value={formData.injuryOrWounds} onValueChange={(v) => handleChange('injuryOrWounds', v)} disabled={isReadOnly}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no_evidence" id="iw-1" />
                                            <Label htmlFor="iw-1">No evidence of injury, bleeding or wounds</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="signs_of_new_pain" id="iw-2" />
                                            <Label htmlFor="iw-2">Evidence of swelling, bruising, bleeding or deformity/shortening/rotation of limb</Label>
                                        </div>
                                    </RadioGroup>
                                    <div className="pl-6 space-y-2 mt-2">
                                        <Label className="text-sm text-slate-500">Where is the injury or wound/s?</Label>
                                        <Input
                                            value={formData.injuryLocation}
                                            onChange={(e) => handleChange('injuryLocation', e.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Enter location..."
                                            className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                        />
                                    </div>
                                </div>

                                {/* Mobility */}
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">Movement and mobility</Label>
                                    <RadioGroup value={formData.movementAndMobility} onValueChange={(v) => handleChange('movementAndMobility', v)} disabled={isReadOnly}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="able_usual" id="mm-1" />
                                            <Label htmlFor="mm-1">Able to move all limbs as usual for the resident and has no new pain on movement</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="able_new_pain" id="mm-2" />
                                            <Label htmlFor="mm-2">Able to move limbs but has new pain on movement</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="unable_usual" id="mm-3" />
                                            <Label htmlFor="mm-3">Unable to move limbs as usual for the resident or there is a major change in mobility</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-bold">Observations, including neurological observations (in nursing homes only)</Label>
                                    <Textarea
                                        value={formData.observations}
                                        onChange={(e) => handleChange('observations', e.target.value)}
                                        disabled={isReadOnly}
                                        placeholder="Enter observations here..."
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 min-h-[auto] resize-none" : "min-h-[100px]"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vitals Section */}
                        <div className="p-6 space-y-6 bg-slate-50/30">
                            <h3 className="font-bold text-lg border-b pb-2">Vital Signs</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <Label>Heart Rate</Label>
                                    <Input
                                        value={formData.heartRate}
                                        onChange={(e) => handleChange('heartRate', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Blood Pressure (Lying)</Label>
                                    <Input
                                        value={formData.bpLying}
                                        onChange={(e) => handleChange('bpLying', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Blood Pressure (Standing)</Label>
                                    <Input
                                        value={formData.bpStanding}
                                        onChange={(e) => handleChange('bpStanding', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Blood Sugar</Label>
                                    <Input
                                        value={formData.bloodSugar}
                                        onChange={(e) => handleChange('bloodSugar', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Respiratory Rate</Label>
                                    <Input
                                        value={formData.respiratoryRate}
                                        onChange={(e) => handleChange('respiratoryRate', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Oxygen Saturations</Label>
                                    <Input
                                        value={formData.oxygenSaturations}
                                        onChange={(e) => handleChange('oxygenSaturations', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Neuro Obs GCS score</Label>
                                    <Input
                                        value={formData.neuroObsGcs}
                                        onChange={(e) => handleChange('neuroObsGcs', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Temperature</Label>
                                    <Input
                                        value={formData.temperature}
                                        onChange={(e) => handleChange('temperature', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-semibold" : ""}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Conclusion Section */}
                        <div className="p-6 space-y-6">
                            <h3 className="font-bold text-xl text-slate-800">Conclusion of assessment (24hrs post fall)</h3>

                            <RadioGroup value={formData.conclusionType} onValueChange={(v) => {
                                handleChange('conclusionType', v);
                                handleChange('conclusionChecklist', []); // Clear checklist when type changes
                            }} disabled={isReadOnly} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-4 p-4 rounded-lg border bg-green-50/10">
                                        <RadioGroupItem value="no_injury" id="ct-1" className="mt-1" />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="ct-1" className="text-base font-bold text-green-700">No obvious injury sustained</Label>
                                        </div>
                                    </div>
                                    {formData.conclusionType === 'no_injury' && (
                                        <div className="pl-12 space-y-3">
                                            {[
                                                "Assisted resident to a comfortable place",
                                                "Completed falls assessment tool, body map and 24 hr observation chart",
                                                "Informed family, named worker, GP and RQIA-if appropriate",
                                                "Completed all relevant paperwork"
                                            ].map((item) => (
                                                <div key={item} className="flex items-start space-x-2">
                                                    <Checkbox
                                                        id={`item-${item}`}
                                                        checked={formData.conclusionChecklist?.includes(item)}
                                                        onCheckedChange={() => handleChecklistToggle(item)}
                                                        disabled={isReadOnly}
                                                    />
                                                    <Label htmlFor={`item-${item}`} className="text-sm leading-none cursor-pointer">{item}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start space-x-4 p-4 rounded-lg border bg-yellow-50/10">
                                        <RadioGroupItem value="minor_injury" id="ct-2" className="mt-1" />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="ct-2" className="text-base font-bold text-yellow-700">Minor Injury sustained</Label>
                                        </div>
                                    </div>
                                    {formData.conclusionType === 'minor_injury' && (
                                        <div className="pl-12 space-y-3">
                                            {[
                                                "Assisted resident to a comfortable place",
                                                "Administered First Aid",
                                                "Completed falls assessment tool, body map and 24 hr observation chart",
                                                "Informed family, named worker, GP and RQIA-if appropriate",
                                                "Completed all relevant paperwork"
                                            ].map((item) => (
                                                <div key={item} className="flex items-start space-x-2">
                                                    <Checkbox
                                                        id={`item-${item}`}
                                                        checked={formData.conclusionChecklist?.includes(item)}
                                                        onCheckedChange={() => handleChecklistToggle(item)}
                                                        disabled={isReadOnly}
                                                    />
                                                    <Label htmlFor={`item-${item}`} className="text-sm leading-none cursor-pointer">{item}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start space-x-4 p-4 rounded-lg border bg-red-50/10">
                                        <RadioGroupItem value="serious_injury" id="ct-3" className="mt-1" />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="ct-3" className="text-base font-bold text-red-700">Serious injury sustained</Label>
                                        </div>
                                    </div>
                                    {formData.conclusionType === 'serious_injury' && (
                                        <div className="pl-12 space-y-4">
                                            {[
                                                "NIAS called",
                                                "Completed falls assessment tools, body map and observation chart",
                                                "Informed family, named worker, GP and RQIA",
                                                "Completed all relevant paperwork"
                                            ].map((item) => (
                                                <div key={item} className="space-y-4">
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={`item-${item}`}
                                                            checked={formData.conclusionChecklist?.includes(item)}
                                                            onCheckedChange={() => handleChecklistToggle(item)}
                                                            disabled={isReadOnly}
                                                        />
                                                        <Label htmlFor={`item-${item}`} className="text-sm leading-none cursor-pointer">{item}</Label>
                                                    </div>

                                                    {item === "NIAS called" && formData.conclusionChecklist?.includes("NIAS called") && (
                                                        <div className="pl-6 space-y-4 animate-in slide-in-from-left-2 duration-200">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-500">Time NIAS Called</Label>
                                                                    {isReadOnly ? (
                                                                        <p className="text-sm">
                                                                            {formatIncidentTimeDisplay(formData.niasTime) || "—"}
                                                                        </p>
                                                                    ) : (
                                                                        <IncidentTimeSelect
                                                                            value={formData.niasTime}
                                                                            onChange={(value) =>
                                                                                handleChange("niasTime", value)
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-500">Outcome</Label>
                                                                    <RadioGroup
                                                                        value={formData.niasOutcome}
                                                                        onValueChange={(v) => handleChange('niasOutcome', v)}
                                                                        disabled={isReadOnly}
                                                                        className="flex flex-col space-y-2"
                                                                    >
                                                                        <div className="flex items-center space-x-2">
                                                                            <RadioGroupItem value="remained_in_home" id="no-1" />
                                                                            <Label htmlFor="no-1" className="text-xs">Remained in Home</Label>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <RadioGroupItem value="transferred_to_ed" id="no-2" />
                                                                            <Label htmlFor="no-2" className="text-xs">Transferred to ED</Label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Footer Section */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/20">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Print Name</Label>
                                    <Input
                                        value={formData.footerName}
                                        onChange={(e) => handleChange('footerName', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Date and Time</Label>
                                    <Input
                                        type={isReadOnly ? "text" : "datetime-local"}
                                        value={isReadOnly ? format(new Date(formData.footerDateTime), "PPpp") : formData.footerDateTime}
                                        onChange={(e) => handleChange('footerDateTime', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Signature (Type name)</Label>
                                    <Input
                                        value={formData.footerSignature}
                                        onChange={(e) => handleChange('footerSignature', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100 font-serif italic" : "font-serif italic"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Designation</Label>
                                    <Input
                                        value={formData.footerDesignation}
                                        onChange={(e) => handleChange('footerDesignation', e.target.value)}
                                        disabled={isReadOnly}
                                        className={isReadOnly ? "border-none bg-transparent shadow-none px-0 disabled:opacity-100" : ""}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Print Footer */}
            <div className="hidden print:block border-t pt-8 mt-12 text-sm text-slate-500">
                <div className="flex justify-between">
                    <div>Generated by CareO</div>
                    <div>{format(new Date(), "PPpp")}</div>
                </div>
            </div>
        </div>
    );
}
