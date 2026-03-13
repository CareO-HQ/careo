import { z } from "zod";

export const BloodMonitoringSchema = z.object({
  residentId: z.string().uuid("Invalid resident ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  teamId: z.string().uuid("Invalid team ID").optional(),
  userId: z.string().uuid("Invalid user ID").optional(),
  date: z.coerce.number().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  bmLevel: z.string().min(1, "BM Level is required"),
  siteUsed: z.string().min(1, "Site used is required"),
  signature: z.string().min(1, "Signature is required"),
});

export type BloodMonitoringFormValues = z.infer<typeof BloodMonitoringSchema>;
