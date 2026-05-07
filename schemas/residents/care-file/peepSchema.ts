import { z } from "zod";

export const peepSchema = z.object({
  // Header Information
  facilityName: z.string().optional(),
  residentName: z.string().optional(),
  residentDateOfBirth: z.number().optional(),
  nextReviewDate: z.string().optional(),
  bedroomNumber: z.string().optional(),
  unit: z.string().optional(),

  // Awareness of Procedure
  informedBy: z.object({
    alarmSystem: z.boolean(),
    visualAlarm: z.boolean(),
    pagerDevice: z.boolean(),
    other: z.boolean(),
    otherDetails: z.string().optional(),
  }).optional(),

  // Assistance & Equipment
  designatedAssistance: z.string().optional(),
  equipmentRequired: z.string().optional(),

  // Personalised Evacuation Procedure (Dynamic steps)
  steps: z.array(z.object({
    name: z.string(),
    description: z.string()
  })).optional(),

  // Fire Hazards in Area Room
  hazards: z.object({
    oxygenCylinders: z.boolean().optional(),
    furnishingsFireRetardant: z.boolean().optional(),
    doesPersonSmoke: z.boolean().optional(),
  }).optional(),

  // Monitoring and Review / Signatures
  managerSignature: z.string().optional(),
  managerSignatureDate: z.number().optional(),
  personInCareSignature: z.string().optional(),
  personInCareSignatureDate: z.number().optional(),

  // Optional metadata fields for drafts/backwards compatibility
  status: z.enum(["draft", "submitted", "reviewed"]).optional(),
});

export type PeepFormData = z.infer<typeof peepSchema>;
