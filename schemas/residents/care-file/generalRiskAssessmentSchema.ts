import { z } from "zod";

export const reasonForAssessmentOptions = [
    "New admission",
    "Change in condition",
    "Routine review",
    "Incident or accident"
] as const;

export const areasOfRiskOptions = [
    "Falls and mobility",
    "Skin integrity / pressure ulcers",
    "Nutrition and hydration",
    "Medication management",
    "Behavioural or cognitive risks",
    "Infection control",
    "Manual handling needs",
    "Environmental hazards",
    "Wandering or absconding",
    "Choking or swallowing difficulties"
] as const;

export const equipmentOptions = [
    "Walking aid",
    "Pressure-relieving mattress or cushion",
    "Bed rails",
    "Sensor mats or alarms",
    "Specialist diet or thickened fluids",
    "Increased supervision"
] as const;

export const reviewFrequencyOptions = [
    "Weekly",
    "Monthly",
    "Quarterly",
    "After any incident"
] as const;

export const riskLevelSchema = z.object({
    area: z.string(),
    level: z.enum(["low", "medium", "high"]).optional(),
    notes: z.string().optional()
});

export const generalRiskAssessmentSchema = z.object({
    // Section A — Resident Information
    fullName: z.string().min(1, "Full name is required"),
    dateOfBirth: z.string().optional(),
    nhsNumber: z.string().optional(),
    roomNumber: z.string().optional(),
    dateOfAssessment: z.string().optional(),

    // Section B — Assessment Details
    assessmentCompletedBy: z.string().min(1, "Assessor name is required"),
    role: z.string().optional(),
    reasonForAssessment: z.array(z.string()).optional(),
    otherReason: z.string().optional(),

    // Section C — Areas of Risk
    areasOfRisk: z.array(z.string()).optional(),
    otherArea: z.string().optional(),

    // Section D — Description of Identified Risks
    riskDescription: z.string().optional(),

    // Section E — Risk Levels (one row per identified risk area)
    riskLevels: z.array(riskLevelSchema).optional(),

    // Section F — Control Measures
    controlMeasures: z.string().optional(),

    // Section G — Equipment or Support Required
    equipmentRequired: z.array(z.string()).optional(),
    otherEquipment: z.string().optional(),

    // Section H — Resident/Representative Involvement
    residentInvolvement: z.array(z.string()).optional(),
    involvementComments: z.string().optional(),

    // Section I — Review and Monitoring
    reviewFrequency: z.array(z.string()).optional(),
    otherFrequency: z.string().optional(),
    nextReviewDate: z.string().optional(),

    // Section J — Signatures
    assessorSignature: z.string().optional(),
    signatureDate: z.string().optional(),

    // System
    status: z.enum(["draft", "submitted"]).default("submitted")
});

export type GeneralRiskAssessmentFormData = z.infer<typeof generalRiskAssessmentSchema>;
