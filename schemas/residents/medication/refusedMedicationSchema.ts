import { z } from "zod";

export const RefusedMedicationSchema = z.object({
  residentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  date: z.number(), // timestamp
  medicationId: z.string().uuid({ message: "Please select a medication" }),
  dose: z.string().min(1, { message: "Dose is required" }),
  count: z.string().min(1, { message: "Count is required" }),
  reasonForReturn: z.string().optional(),
  reasonForRefused: z.string().min(1, { message: "Reason for refused is required" }),
  signature: z.string().min(1, { message: "Signature is required" }),
});

export type RefusedMedicationFormValues = z.infer<typeof RefusedMedicationSchema>;
