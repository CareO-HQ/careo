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
  insulinAdministered: z.boolean(),
  siteUsed: z.string().optional(),
  signature1: z.string().min(1, "Signature 1 is required"),
  signature2: z.string().optional(),
}).superRefine((data, ctx) => {
  const value = Number(data.bloodSugar.trim());
  if (data.bloodSugar.trim() && (!Number.isFinite(value) || value < 0.5 || value > 40)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bloodSugar"],
      message: "Blood sugar must be a number between 0.5 and 40 mmol/L",
    });
  }
  // Insulin is a high-risk medicine: record the site and a second checker.
  if (data.insulinAdministered) {
    if (!data.siteUsed?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["siteUsed"], message: "Injection site is required when insulin is given" });
    }
    if (!data.signature2?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signature2"], message: "A second signature is required when insulin is given" });
    }
  }
});

export type BloodMonitoringFormValues = z.infer<typeof BloodMonitoringSchema>;
