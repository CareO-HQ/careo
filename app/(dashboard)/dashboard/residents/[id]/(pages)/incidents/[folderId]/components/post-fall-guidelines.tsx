"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, AlertCircle, CheckCircle, AlertTriangle, FileText } from "lucide-react";

type Pathway = "green" | "amber" | "red";

export function PostFallGuidelines() {
    const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);

    const pathways = [
        {
            id: "green" as Pathway,
            title: "Green Pathway",
            color: "bg-emerald-50 border-emerald-200 text-emerald-900",
            activeColor: "bg-emerald-100 border-emerald-400 ring-2 ring-emerald-500",
            headerColor: "text-emerald-700",
            icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
            conditions: [
                "No obvious injury or unwitnessed fall with no evidence of loss of consciousness",
                "No bruising",
                "No obvious head injury",
                "No new pain",
                "Mobility unaffected",
                "No wounds or bleeding",
                "No limb deformity",
            ],
            actionsTitle: "Green Pathway Actions",
            actions: [
                "Assist resident to a place of safety and comfort if it is safe (using hoist or handling aid if required)",
                "Complete: Forms A, B and C (plus vital signs in nursing home setting)",
                "Inform family, GP and named worker",
                "Document all actions",
            ],
        },
        {
            id: "amber" as Pathway,
            title: "Amber Pathway",
            color: "bg-amber-50 border-amber-200 text-amber-900",
            activeColor: "bg-amber-100 border-amber-400 ring-2 ring-amber-500",
            headerColor: "text-amber-700",
            icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
            conditions: [
                "Minor injury or minor head injury*",
                "Signs of bruising",
                "Minor wounds to skin including face",
                "New pain",
            ],
            note: "*If minor head injury, liaise with GP re pausing/stopping anticoagulant/antiplatelet therapy",
            actionsTitle: "Amber Pathway Actions",
            actions: [
                "Administer first aid and prescribed pain relief as required",
                "Assist resident to a safe and comfortable place if it is safe to do so (using hoist or handling aid if required)",
                "Complete: Forms A, B and C (plus vital signs in nursing home setting)",
                "Inform family, GP/Out of hours via phone",
                "Document all actions",
            ],
        },
        {
            id: "red" as Pathway,
            title: "Red Pathway",
            color: "bg-red-50 border-red-200 text-red-900",
            activeColor: "bg-red-100 border-red-400 ring-2 ring-red-500",
            headerColor: "text-red-700",
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            conditions: [
                "Airway or breathing problem",
                "Loss of consciousness or unresponsive",
                "Acute loss of mobility or movement in limbs",
                "Moderate or significant head injury (please refer to signs and symptoms of head injury on page 7)",
                "Other moderate or significant injury to any part of body",
                "Actual or suspected collapse",
                "Acute confusion or altered behaviour which differs from the resident's baseline",
                "Uncontrolled bleeding or extensive bruising",
                "New onset of intense pain",
            ],
            actionsTitle: "Red Pathway Actions",
            actions: [
                "Call 999 for Ambulance",
                "Registered HCPs should continue to also use clinical decision making",
                "Inform family",
                "Complete: Forms A, B and C (plus vital signs in nursing home setting)",
                "If resident is lying on floor for more than 1 hour, see 'Resident experiencing a long lie' poster for further info",
                "NIAS will have a clinician call back to assess or dispatch a vehicle (meet paramedics at door and escort to resident, have your records and monitoring available)",
                "NIAS clinicians will then decide whether the resident is to remain in the home or to transfer the resident to ED (prepare appropriate documentation for transfer)",
            ],
        },
    ];

    const handlePathwayClick = (id: Pathway) => {
        setSelectedPathway(selectedPathway === id ? null : id);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <h1 className="text-3xl font-extrabold text-slate-900 border-b-4 border-blue-600 pb-2 inline-block">
                            POST FALL GUIDELINES
                        </h1>
                        <div className="grid gap-3 text-slate-600 text-[15px] leading-relaxed">
                            <p className="font-semibold text-slate-800">Ensure the environment is free from hazard. Ask the resident what happened.</p>
                            <p>Proceed to assess the resident and follow actions in the appropriate colour pathway below.</p>
                            <p>Consent and capacity or the resident’s wishes must be factored into decision-making.</p>
                            <p>Also refer to <strong>Treatment Escalation Plan/Advance Care Plan</strong> where available.</p>
                            <p className="text-sm italic bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                Registered Health Care Professionals (HCPs) should continue to use their clinical judgement and decision-making skills as appropriate when using these guidelines
                            </p>
                        </div>
                    </div>

                    {/* Three Vertical Flows */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {pathways.map((path) => {
                            const isSelected = selectedPathway === path.id;
                            const isOtherSelected = selectedPathway !== null && !isSelected;

                            return (
                                <div
                                    key={path.id}
                                    className={`flex flex-col transition-all duration-500 ${isOtherSelected ? "opacity-30 scale-[0.98] grayscale-[0.3]" : "opacity-100 scale-100"}`}
                                >
                                    {/* Stage 1: Assessment */}
                                    <motion.div
                                        whileHover={{ y: -5 }}
                                        onClick={() => handlePathwayClick(path.id)}
                                        className={`cursor-pointer rounded-2xl border-2 p-6 h-full shadow-sm transition-colors duration-300 ${isSelected ? path.activeColor : path.color}`}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            {path.icon}
                                            <h2 className="font-bold text-lg uppercase tracking-wide">{path.title}</h2>
                                        </div>
                                        <ul className="space-y-2.5">
                                            {path.conditions.map((cond, i) => (
                                                <li key={i} className="text-[13px] flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                                                    <span>{cond}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {path.note && (
                                            <div className="mt-4 pt-3 border-t border-current/10 text-[11px] italic leading-tight">
                                                {path.note}
                                            </div>
                                        )}
                                    </motion.div>

                                    {/* Arrow Indicator */}
                                    <div className="flex justify-center py-4">
                                        <ArrowDown className={`w-8 h-8 ${path.headerColor} ${isSelected ? "animate-bounce" : "opacity-30"}`} />
                                    </div>

                                    {/* Stage 2: Actions */}
                                    <motion.div
                                        whileHover={{ y: -5 }}
                                        onClick={() => handlePathwayClick(path.id)}
                                        className={`cursor-pointer rounded-2xl border-2 p-6 shadow-sm transition-colors duration-300 ${isSelected ? path.activeColor : path.color}`}
                                    >
                                        <h3 className="font-bold text-sm mb-4 uppercase tracking-wider opacity-80">{path.actionsTitle}</h3>
                                        <ul className="space-y-3">
                                            {path.actions.map((action, i) => (
                                                <li key={i} className="text-[13px] flex items-start gap-2 font-medium">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                                                    <span>{action}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Call 999 Alert */}
                    <div className="flex flex-col items-center py-4">
                        <ArrowDown className="w-8 h-8 text-slate-400 mb-2" />
                        <div className="bg-white border-2 border-slate-900 rounded-xl px-10 py-4 shadow-md text-center">
                            <p className="text-lg font-black text-slate-900 uppercase">
                                If the resident’s condition deteriorates at all, <span className="text-red-600 underline">call 999</span>
                            </p>
                        </div>
                    </div>

                    {/* Bottom Section: Learning and Post-Admission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                        <div className="bg-slate-200 border border-slate-300 rounded-xl p-6 shadow-sm flex items-start gap-4">
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" />
                            <p className="text-[13px] text-slate-700 leading-relaxed">
                                In all cases, review all relevant falls risk checklists and ensure any learning is communicated, documented and implemented with consent and agreement of resident.
                            </p>
                        </div>
                        <div className="bg-slate-200 border border-slate-300 rounded-xl p-6 shadow-sm space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</div>
                                <p className="text-[13px] text-slate-700">If resident is admitted for greater than 24 hrs, then complete relevant risk assessments on return to care home</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</div>
                                <p className="text-[13px] text-slate-700">If resident is assessed and discharged back to care home, continue to complete <strong>Forms A, B and C</strong></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
