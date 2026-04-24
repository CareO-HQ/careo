import { z } from "zod";

export const BloodMonitoringSchema = z.object({
  residentId: z.string().uuid("Invalid resident ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  teamId: z.string().uuid("Invalid team ID").optional(),
  userId: z.string().uuid("Invalid user ID").optional(),
  date: z.coerce.number().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  bloodSugar: z.string().min(1, "Blood sugar is required"),
  ketones: z.string().optional(),
  mealStatus: z.string().min(1, "Pre/Post meal is required"),
  insulinAdministered: z.boolean().default(false),
  siteUsed: z.string().optional(),
  signature1: z.string().min(1, "Signature 1 is required"),
  signature2: z.string().optional(),
});

export type BloodMonitoringFormValues = z.infer<typeof BloodMonitoringSchema>;
