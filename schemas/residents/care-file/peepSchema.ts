import { z } from "zod";

export const peepSchema = z.object({
  // Resident information
  residentName: z.string().min(1, "Resident name is required"),
  residentDateOfBirth: z.number().positive("Date of birth is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),

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
  completedBy: z.string().min(1, "Completed by is required"),
  completedBySignature: z.string().min(1, "Signature is required"),
  date: z.number().positive("Date is required"),

  // Optional metadata fields for drafts
  status: z.enum(["draft", "submitted", "reviewed"]).optional()
});

export type PeepFormData = z.infer<typeof peepSchema>;
