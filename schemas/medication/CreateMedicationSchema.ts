import { z } from "zod";

export const CreateMedicationSchema = z
  .object({
    name: z.string().min(1),
    strength: z.string().min(1),
    strengthUnit: z.union([z.literal("mg"), z.literal("g")]),
    totalCount: z.number(),
    dosageForm: z.union([
      z.literal("Tablet"),
      z.literal("Capsule"),
      z.literal("Liquid"),
      z.literal("Injection"),
      z.literal("Cream"),
      z.literal("Ointment"),
      z.literal("Patch"),
      z.literal("Inhaler")
    ]),
    route: z.union([
      z.literal("Oral"),
      z.literal("Topical"),
      z.literal("Intramuscular (IM)"),
      z.literal("Intravenous (IV)"),
      z.literal("Subcutaneous"),
      z.literal("Inhalation"),
      z.literal("Rectal"),
      z.literal("Sublingual")
    ]),
    frequency: z.union([
      z.literal("Once daily (OD)"),
      z.literal("Twice daily (BD)"),
      z.literal("Three times daily (TD)"),
      z.literal("Four times daily (QDS)"),
      z.literal("Four times daily (QIS)"),
      z.literal("As Needed (PRN)"),
      z.literal("One time (STAT)"),
      z.literal("Weekly"),
      z.literal("Monthly")
    ]),
    scheduleType: z.union([
      z.literal("Scheduled"),
      z.literal("PRN (As Needed)")
    ]),
    times: z.array(z.string()).optional(),
    timeQuantities: z.record(z.string(), z.number().min(1)).optional(),
    prescriberName: z.string().min(1, {
      message: "Prescriber name is required"
    }),
    instructions: z.string().optional(),
    startDate: z.date(),
    endDate: z.date().optional(),
    status: z.union([
      z.literal("active"),
      z.literal("completed"),
      z.literal("cancelled")
    ]),
    // Controlled Drug fields
    isControlledDrug: z.boolean().optional(),
    controlledDrugSchedule: z
      .union([z.literal("2"), z.literal("3"), z.literal("4"), z.literal("5")])
      .optional(),
    // PRN Safety Limits
    minIntervalHours: z.number().positive().optional(),
    maxDailyDose: z.number().positive().optional(),
    maxDailyDoseUnit: z.string().optional()
  })
  .refine(
    (data) => {
      // If scheduleType is "Scheduled", times must be provided and not empty
      if (data.scheduleType === "Scheduled") {
        return data.times && data.times.length > 0;
      }
      return true;
    },
    {
      message: "At least one time is required for scheduled medications",
      path: ["times"]
    }
  );
