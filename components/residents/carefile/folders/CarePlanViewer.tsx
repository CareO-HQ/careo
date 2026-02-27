"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return "N/A";
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "N/A";
        return format(date, formatStr);
    } catch (e) {
        return "N/A";
    }
};

interface CarePlanViewerProps {
    data: any;
    onAddEvaluation?: () => void;
}

export function CarePlanViewer({ data, onAddEvaluation }: CarePlanViewerProps) {
    if (!data) return <div className="p-8 text-center text-muted-foreground">No data available</div>;

    const goals = data.goals || {};

    // Helper to get value from top level or within goals
    const getValue = (key: string, goalsKey?: string) => {
        return data[key] || goals[goalsKey || key] || "N/A";
    };

    const residentName = getValue("resident_name", "residentName");
    const bedroomNumber = getValue("bedroom_number", "bedroomNumber");
    const dob = getValue("dob");
    const carePlanNumber = getValue("care_plan_number", "carePlanNumber");
    const writtenBy = getValue("written_by", "writtenBy");
    const dateWritten = getValue("date_written", "dateWritten");

    const identifiedNeeds = data.need_identified || goals.identifiedNeeds || data.identifiedNeeds || "N/A";
    const aims = goals.aims || data.aims || "N/A";

    const plannedCareDate = data.interventions || data.plannedCareDate || [];

    const discussedWith = goals.discussedWith || data.discussedWith || "N/A";
    const signature = goals.signature || data.signature || "N/A";
    const staffSignature = goals.staffSignature || data.staffSignature || "N/A";

    // Reusable row component for label-value pairs with bottom border
    const FieldRow = ({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) => (
        <div className={`grid grid-cols-[minmax(200px,2fr),3fr] gap-6 py-3 ${!isLast ? "border-b border-gray-100" : ""}`}>
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-sm text-foreground">{value}</p>
        </div>
    );

    return (
        <div className="w-full max-w-4xl mx-auto space-y-10 pb-12">

            {/* ── BASIC INFORMATION ─────────────────────────────────── */}
            <section className="border border-gray-200 rounded-xl p-6 sm:p-8 bg-white">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                    Basic Information
                </h3>

                <FieldRow label="Resident Name" value={residentName} />
                <FieldRow label="Room Number" value={bedroomNumber} />
                <FieldRow label="Date of Birth" value={safeFormat(dob, "dd MMM yyyy")} />
                <FieldRow label="Care Plan Number" value={carePlanNumber} />
                <FieldRow label="Written By" value={writtenBy} />
                <FieldRow label="Date Written" value={safeFormat(dateWritten, "dd MMM yyyy")} isLast />
            </section>

            {/* ── CARE PLAN DETAILS ─────────────────────────────────── */}
            <section className="space-y-5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Care Plan Details
                </h3>

                <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Identified Needs / Problem Statement</p>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {identifiedNeeds}
                    </p>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-1">
                    <p className="text-sm font-bold text-foreground">Goals / Aims</p>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {aims}
                    </p>
                </div>
                <div className="border-t border-gray-100" />
            </section>

            {/* ── PLANNED CARE / INTERVENTIONS ──────────────────────── */}
            <section className="space-y-5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Planned Care / Interventions
                </h3>

                {plannedCareDate && plannedCareDate.length > 0 ? (
                    <div className="space-y-4">
                        {plannedCareDate.map((entry: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-xl p-6 sm:p-8 bg-white space-y-1">
                                <p className="text-sm font-bold text-foreground mb-3">{index + 1}</p>

                                <FieldRow label="Date" value={safeFormat(entry.date, "dd MMM yyyy")} />

                                {entry.time && (
                                    <FieldRow label="Time" value={entry.time} />
                                )}

                                <div className="py-3 border-b border-gray-100 space-y-1">
                                    <p className="text-sm font-bold text-foreground">Care Details / Actions</p>
                                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                        {entry.details || "N/A"}
                                    </p>
                                </div>

                                <FieldRow label="Staff Signature" value={entry.signature || "N/A"} isLast />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No entries yet</p>
                )}
            </section>

            {/* ── REVIEW OF PATIENT OR REPRESENTATIVE ───────────────── */}
            <section className="space-y-5">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Review of Patient or Representative
                </h3>

                <div>
                    <FieldRow label="Discussed With" value={discussedWith} />
                    <FieldRow label="Patient/Representative Signature" value={signature} />
                    <FieldRow label="Staff Signature" value={staffSignature} isLast />
                </div>
            </section>

            {/* ── ADD EVALUATION BUTTON ─────────────────────────────── */}
            <div className="flex justify-center pt-4">
                <Button
                    onClick={onAddEvaluation}
                    className="bg-black text-white hover:bg-black/90 rounded-lg px-6 h-10 gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Evaluation
                </Button>
            </div>
        </div>
    );
}
