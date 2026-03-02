import { z } from "zod";

export const peepSchema = z.object({
  // Resident information
  residentName: z.string().optional(),
  residentDateOfBirth: z.number().optional(),
  bedroomNumber: z.string().optional(),

  // Questions
  understands: z.boolean(),
  staffNeeded: z.number().min(0, "Required"),
  equipmentNeeded: z.string().optional(),
  communicationNeeds: z.string().optional(),

  // Steps
  steps: z
    .array(
      z.object({
        name: z.string().min(1, "Step name is required"),
        description: z.string().min(1, "Step description is required")
      })
    )
    .optional(),

  // Safety Questions
  oxigenInUse: z.boolean(),
  oxigenComments: z.string().optional(),
  residentSmokes: z.boolean(),
  residentSmokesComments: z.string().optional(),
  furnitureFireRetardant: z.boolean(),
  furnitureFireRetardantComments: z.string().optional(),

  // Completion details
  completedBy: z.string().optional(),
  completedBySignature: z.string().optional(),
  assessmentDate: z.number().optional(),

  // Optional metadata fields for drafts
  status: z.enum(["draft", "submitted", "reviewed"]).optional()
});

export type PeepFormData = z.infer<typeof peepSchema>;
