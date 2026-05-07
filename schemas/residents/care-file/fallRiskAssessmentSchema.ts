import { z } from "zod";

/**
 * Fall Risk Assessment Schema
 */

export const FALL_RISK_OPTIONS = {
    age: [
        { label: "86+", value: 3 },
        { label: "81-85", value: 2 },
        { label: "65-80", value: 1 },
        { label: "Under 65", value: 0 },
    ],
    gender: [
        { label: "Female", value: 3 },
        { label: "Male", value: 1 },
    ],
    historyOfFalls: [
        { label: "Recurrent falls in last 12 months", value: 3 },
        { label: "Fall in last 12 months", value: 2 },
        { label: "Fall more than 12 months ago", value: 1 },
        { label: "Never Fallen", value: 0 },
    ],
    mobilityLevel: [
        { label: "Assistance of 1 +/- aid", value: 3 },
        { label: "Assistance of 2 +/- aid", value: 2 },
        { label: "Independent with walking aid", value: 1 },
        { label: "Independent and safe unaided", value: 0 },
        { label: "Immobile/Hoist", value: 0 },
    ],
    balance: [
        { label: "No", value: 3 },
        { label: "Yes", value: 0 },
    ],
    adlPersonal: [
        { label: "Requires assistance", value: 2 },
        { label: "Independent with equipment", value: 1 },
        { label: "Independent & Safe", value: 0 },
    ],
    adlDomestic: [
        { label: "Requires assistance", value: 2 },
        { label: "Independent with equipment", value: 1 },
        { label: "Independent & Safe", value: 0 },
    ],
    footwear: [
        { label: "Unsafe", value: 3 },
        { label: "Safe", value: 0 },
    ],
    visionProblems: [
        { label: "Yes", value: 3 },
        { label: "No", value: 0 },
    ],
    bladderBowel: [
        { label: "Frequency", value: 3 },
        { label: "Identified problems", value: 2 },
        { label: "No identified problems", value: 0 },
    ],
    environmentalRisks: [
        { label: "Yes", value: 3 },
        { label: "No", value: 0 },
    ],
    socialRisks: [
        { label: "Lives Alone", value: 3 },
        { label: "Residential limited support", value: 2 },
        { label: "24-hour care", value: 1 },
    ],
    medicalConditions: [
        { label: "Neurological", value: 2 },
        { label: "Postural", value: 2 },
        { label: "Cardiac", value: 2 },
        { label: "MuscularSkeletal", value: 2 },
        { label: "Fracture", value: 2 },
        { label: "Listed conditions", value: 1 },
        { label: "No identified medical conditions", value: 0 },
    ],
    medicines: [
        { label: "4 or more medicines", value: 3 },
        { label: "Less than 4 medicines", value: 1 },
        { label: "No medicines", value: 0 },
    ],
    safetyAwareness: [
        { label: "No", value: 3 },
        { label: "Yes", value: 0 },
    ],
    mentalState: [
        { label: "Confused", value: 3 },
        { label: "Orientated", value: 0 },
    ],
};

export const fallRiskAssessmentSchema = z.object({
    // Administrative Information
    residentName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    dateOfAssessment: z.string().optional(),
    nextReviewDate: z.string().optional(),
    time: z.string().optional(),

    // Assessment Categories (storing labels for unique selection)
    age: z.string().default("Under 65"),
    gender: z.string().default("Male"),
    historyOfFalls: z.string().default("Never Fallen"),
    mobilityLevel: z.string().default("Independent and safe unaided"),
    balance: z.string().default("Yes"),
    adlPersonal: z.string().default("Independent & Safe"),
    adlDomestic: z.string().default("Independent & Safe"),
    footwear: z.string().default("Safe"),
    visionProblems: z.string().default("No"),
    bladderBowel: z.string().default("No identified problems"),
    environmentalRisks: z.string().default("No"),
    socialRisks: z.string().default("24-hour care"),
    medicalConditions: z.string().default("No identified medical conditions"),
    medicines: z.string().default("No medicines"),
    safetyAwareness: z.string().default("Yes"),
    mentalState: z.string().default("Orientated"),

    // Additional fields
    completedBy: z.string().optional(),
    signature: z.string().optional(),

    // System fields
    residentId: z.string().optional(),
    teamId: z.string().optional(),
    organizationId: z.string().optional(),
    userId: z.string().optional(),
    savedAsDraft: z.boolean().optional(),
});

export type FallRiskAssessmentFormData = z.infer<typeof fallRiskAssessmentSchema>;

/**
 * Calculate total fall risk score based on assessment responses
 * @param data - The fall risk assessment form data
 * @returns Total fall risk score
 */
export function calculateFallRiskScore(data: Partial<FallRiskAssessmentFormData>): number {
    let score = 0;

    // Map function to find score for a given field and label
    const getScore = (field: keyof typeof FALL_RISK_OPTIONS, label?: string) => {
        if (!label) return 0;
        // Legacy support for grouped medical conditions
        if (field === 'medicalConditions' && label === "Neurological/Postural/Cardiac/MuscularSkeletal/Fracture") {
            return 2;
        }
        const options = FALL_RISK_OPTIONS[field];
        const option = options.find(o => o.label === label);
        return option ? option.value : 0;
    };

    score += getScore('age', data.age);
    score += getScore('gender', data.gender);
    score += getScore('historyOfFalls', data.historyOfFalls);
    score += getScore('mobilityLevel', data.mobilityLevel);
    score += getScore('balance', data.balance);
    score += getScore('adlPersonal', data.adlPersonal);
    score += getScore('adlDomestic', data.adlDomestic);
    score += getScore('footwear', data.footwear);
    score += getScore('visionProblems', data.visionProblems);
    score += getScore('bladderBowel', data.bladderBowel);
    score += getScore('environmentalRisks', data.environmentalRisks);
    score += getScore('socialRisks', data.socialRisks);
    score += getScore('medicalConditions', data.medicalConditions);
    score += getScore('medicines', data.medicines);
    score += getScore('safetyAwareness', data.safetyAwareness);
    score += getScore('mentalState', data.mentalState);

    return score;
}

/**
 * Get risk level based on total score
 * @param score - Total fall risk score
 * @returns Risk level description
 */
export function getFallRiskLevel(score: number): "Low Risk" | "Medium Risk" | "High Risk" {
    if (score <= 17) return "Low Risk";
    if (score <= 23) return "Medium Risk";
    return "High Risk";
}
