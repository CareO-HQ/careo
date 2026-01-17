import { z } from "zod";

export const DnacprSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident information
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  dateOfBirth: z.number().refine((val) => !isNaN(val), {
    message: "Date of birth must be a valid timestamp"
  }),

  // Questions
  dnacpr: z.boolean(),
  dnacprComments: z.string().optional(),
  reason: z.enum(["TERMINAL-PROGRESSIVE", "UNSUCCESSFUL-CPR", "OTHER"]),
  date: z.number().positive("Date must be a valid timestamp"),

  // Discussed with
  discussedResident: z.boolean(),
  discussedResidentComments: z.string().optional(),
  discussedResidentDate: z.number().optional(),
  discussedRelatives: z.boolean(),
  discussedRelativesComments: z.string().optional(),
  discussedRelativeDate: z.number().optional(),
  discussedNOKs: z.boolean(),
  discussedNOKsComments: z.string().optional(),
  discussedNOKsDate: z.number().optional(),
  comments: z.string().optional(),

  // GP signature
  gpDate: z.number().positive("GP date must be a valid timestamp"),
  gpSignature: z.string().min(1, "GP signature is required"),
  residentNokSignature: z.string().min(1, "Resident/NOK signature is required"),
  registeredNurseSignature: z
    .string()
    .min(1, "Registered nurse signature is required")
});

export type DnacprFormData = z.infer<typeof DnacprSchema>;
