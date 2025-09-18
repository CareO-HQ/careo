import { v } from "convex/values";
import { defineTable } from "convex/server";

export const managerAuditsValidator = defineTable({
  // Reference to the form/assessment that was audited
  formType: v.union(
    v.literal("movingHandlingAssessment"),
    v.literal("infectionPreventionAssessment"),
    v.literal("carePlanAssessment"),
    v.literal("bladderBowelAssessment"),
    v.literal("preAdmissionCareFile"),
    v.literal("longTermFallsRiskAssessment")
  ),
  formId: v.string(), // ID of the specific form/assessment
  residentId: v.id("residents"),

  // Audit information
  auditedBy: v.string(), // The user who performed the audit

  // Optional audit notes and feedback
  auditNotes: v.optional(v.string()),

  // Organizational structure
  teamId: v.string(),
  organizationId: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number())
});
