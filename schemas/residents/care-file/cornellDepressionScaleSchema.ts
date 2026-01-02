import { z } from "zod";

/**
 * Cornell Scale for Depression in Dementia (CSDD)
 *
 * Scoring:
 * - Each item rated: 0 = Absent, 1 = Mild/Intermittent, 2 = Severe
 * - Score interpretation:
 *   - 0-7: No depression
 *   - 8-12: Mild depression
 *   - 13+: Major depression
 */

const ratingEnum = z.enum(["0", "1", "2"]);

export const cornellDepressionScaleSchema = z.object({
  // Administrative Information
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  dateOfAssessment: z.string().min(1, "Date of assessment is required"),
  assessedBy: z.string().min(1, "Assessed by is required"),

  // A. Mood-Related Signs (5 items)
  anxiety: ratingEnum,
  sadness: ratingEnum,
  lackOfReactivity: ratingEnum,
  irritability: ratingEnum,

  // B. Behavioral Disturbance (4 items)
  agitation: ratingEnum,
  retardation: ratingEnum,
  multiplePhysicalComplaints: ratingEnum,
  lossOfInterest: ratingEnum,

  // C. Physical Signs (2 items)
  appetiteLoss: ratingEnum,
  weightLoss: ratingEnum,

  // D. Cyclic Functions (2 items)
  diurnalVariation: ratingEnum,
  sleepDisturbance: ratingEnum,

  // E. Ideational Disturbance (6 items)
  suicidalIdeation: ratingEnum,
  lowSelfEsteem: ratingEnum,
  pessimism: ratingEnum,
  moodCongruentDelusions: ratingEnum,

  // Completion fields
  signature: z.string().optional(),

  // System fields
  residentId: z.string().optional(),
  teamId: z.string().optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  savedAsDraft: z.boolean().optional(),
});

export type CornellDepressionScaleFormData = z.infer<typeof cornellDepressionScaleSchema>;

/**
 * Calculate total Cornell Depression Scale score
 * @param data - The assessment form data
 * @returns Total score
 */
export function calculateCornellScore(data: Partial<CornellDepressionScaleFormData>): number {
  let score = 0;

  // A. Mood-Related Signs
  score += parseInt(data.anxiety || "0");
  score += parseInt(data.sadness || "0");
  score += parseInt(data.lackOfReactivity || "0");
  score += parseInt(data.irritability || "0");

  // B. Behavioral Disturbance
  score += parseInt(data.agitation || "0");
  score += parseInt(data.retardation || "0");
  score += parseInt(data.multiplePhysicalComplaints || "0");
  score += parseInt(data.lossOfInterest || "0");

  // C. Physical Signs
  score += parseInt(data.appetiteLoss || "0");
  score += parseInt(data.weightLoss || "0");

  // D. Cyclic Functions
  score += parseInt(data.diurnalVariation || "0");
  score += parseInt(data.sleepDisturbance || "0");

  // E. Ideational Disturbance
  score += parseInt(data.suicidalIdeation || "0");
  score += parseInt(data.lowSelfEsteem || "0");
  score += parseInt(data.pessimism || "0");
  score += parseInt(data.moodCongruentDelusions || "0");

  return score;
}

/**
 * Get depression severity level based on total score
 * @param score - Total Cornell Depression Scale score
 * @returns Severity level description
 */
export function getDepressionSeverity(score: number): string {
  if (score <= 7) return "No Depression";
  if (score <= 12) return "Mild Depression";
  return "Major Depression";
}

/**
 * Get color coding for severity level
 * @param severity - Depression severity level
 * @returns Tailwind color class
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "No Depression":
      return "text-green-600";
    case "Mild Depression":
      return "text-yellow-600";
    case "Major Depression":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}
