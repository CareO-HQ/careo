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

    return (
        <div className="columns-1 lg:columns-2 gap-8 w-full pb-12">
            {/* BASIC INFORMATION */}
            <section className="break-inside-avoid mb-10 space-y-6">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">BASIC INFORMATION</h3>
                <div className="space-y-4 w-full px-2">
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Resident Name</p>
                        <p className="text-sm text-foreground">{residentName}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Room Number</p>
                        <p className="text-sm text-foreground">{bedroomNumber}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Date of Birth</p>
                        <p className="text-sm text-foreground">{safeFormat(dob, "dd MMM yyyy")}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Care Plan Number</p>
                        <p className="text-sm text-foreground">{carePlanNumber}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Written By</p>
                        <p className="text-sm text-foreground">{writtenBy}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Date Written</p>
                        <p className="text-sm text-foreground">{safeFormat(dateWritten, "dd MMM yyyy")}</p>
                    </div>
                </div>
                <div className="h-px bg-gray-100" />
            </section>

            {/* CARE PLAN DETAILS */}
            <section className="break-inside-avoid mb-10 space-y-6">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">CARE PLAN DETAILS</h3>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-foreground">Identified Needs / Problem Statement</p>
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                            {identifiedNeeds}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-bold text-foreground">Goals / Aims</p>
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                            {aims}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-gray-100" />
            </section>

            {/* PLANNED CARE / INTERVENTIONS */}
            <section className="break-inside-avoid mb-10 space-y-6">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">PLANNED CARE / INTERVENTIONS</h3>

                <div className="space-y-4">
                    {plannedCareDate && plannedCareDate.length > 0 ? (
                        plannedCareDate.map((entry: any, index: number) => (
                            <div key={index} className="border border-gray-100 rounded-lg p-6 space-y-4">
                                <p className="text-sm font-bold text-foreground">{index + 1}</p>

                                <div className="grid grid-cols-[200px,1fr] gap-4">
                                    <p className="text-sm font-bold text-foreground">Date</p>
                                    <p className="text-sm text-foreground">{safeFormat(entry.date, "dd MMM yyyy")}</p>
                                </div>

                                {entry.time && (
                                    <div className="grid grid-cols-[200px,1fr] gap-4">
                                        <p className="text-sm font-bold text-foreground">Time</p>
                                        <p className="text-sm text-foreground">{entry.time}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-foreground">Care Details / Actions</p>
                                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                        {entry.details || "N/A"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-[200px,1fr] gap-4">
                                    <p className="text-sm font-bold text-foreground">Staff Signature</p>
                                    <p className="text-sm text-foreground">{entry.signature || "N/A"}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground italic px-2">No entries yet</p>
                    )}
                </div>
            </section>

            {/* REVIEW OF PATIENT OR REPRESENTATIVE */}
            <section className="break-inside-avoid mb-10 space-y-6">
                <div className="h-px bg-gray-100 mb-6" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">REVIEW OF PATIENT OR REPRESENTATIVE</h3>

                <div className="space-y-4 w-full px-2">
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Discussed With</p>
                        <p className="text-sm text-foreground">{discussedWith}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Patient/Representative Signature</p>
                        <p className="text-sm text-foreground">{signature}</p>
                    </div>
                    <div className="grid grid-cols-[200px,1fr] gap-4">
                        <p className="text-sm font-bold text-foreground">Staff Signature</p>
                        <p className="text-sm text-foreground">{staffSignature}</p>
                    </div>
                </div>
            </section>

            {/* ADD EVALUATION BUTTON */}
            <div className="break-inside-avoid flex justify-start lg:justify-center pt-8 w-full">
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
