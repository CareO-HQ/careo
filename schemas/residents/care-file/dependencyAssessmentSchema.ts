import { z } from "zod";

/**
 * Dependency Assessment Schema
 * 
 * Scoring System:
 * A. MOBILITY (0-4)
 * B. DRESSING (0-4)
 * C. PERSONAL HYGIENE (0-4)
 * D. FEEDING (0-4)
 * E. EYESIGHT (0-4)
 * F. HEARING (0-4)
 * G. PRESSURE SORE RISK (Braden) (0-4)
 * H. CONTINENCE (Urine) (0-4)
 * I. CONTINENCE (Faeces) (0-4)
 * J. COMMUNICATION (0-4)
 * K. SOCIAL DEPENDENCY (0-4)
 * L. BEHAVIOUR (0, 2, 4, 6, 8, 10)
 */

export const dependencyAssessmentSchema = z.object({
    // Administrative Information
    residentName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    dateOfAssessment: z.string().optional(),
    nextReviewDate: z.string().min(1, "Next review date is required"),
    time: z.string().optional(),

    // Assessment Categories
    mobility: z.number().min(0).max(4).default(0),
    dressing: z.number().min(0).max(4).default(0),
    personalHygiene: z.number().min(0).max(4).default(0),
    feeding: z.number().min(0).max(4).default(0),
    eyesight: z.number().min(0).max(4).default(0),
    hearing: z.number().min(0).max(4).default(0),
    pressureSoreRisk: z.number().min(0).max(4).default(0),
    continenceUrine: z.number().min(0).max(4).default(0),
    continenceFaeces: z.number().min(0).max(4).default(0),
    communication: z.number().min(0).max(4).default(0),
    socialDependency: z.number().min(0).max(4).default(0),
    behaviour: z.number().min(0).max(10).default(0),

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

export type DependencyAssessmentFormData = z.infer<typeof dependencyAssessmentSchema>;

/**
 * Calculate total dependency score based on assessment responses
 * @param data - The dependency assessment form data
 * @returns Total dependency score
 */
export function calculateDependencyScore(data: Partial<DependencyAssessmentFormData>): number {
    let score = 0;
    score += data.mobility || 0;
    score += data.dressing || 0;
    score += data.personalHygiene || 0;
    score += data.feeding || 0;
    score += data.eyesight || 0;
    score += data.hearing || 0;
    score += data.pressureSoreRisk || 0;
    score += data.continenceUrine || 0;
    score += data.continenceFaeces || 0;
    score += data.communication || 0;
    score += data.socialDependency || 0;
    score += data.behaviour || 0;
    return score;
}

/**
 * Get dependency level based on total score
 * @param score - Total dependency score
 * @returns Dependency level description
 */
export function getDependencyLevel(score: number): string {
    if (score <= 22) return "Low Dependency";
    if (score <= 44) return "Medium Dependency";
    if (score <= 66) return "High Dependency";
    return "Very High Dependency";
}
