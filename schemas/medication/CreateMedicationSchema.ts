import { z } from "zod";

export const CreateMedicationSchema = z
  .object({
    name: z.string().min(1),
    strength: z.string().min(1),
    strengthUnit: z.union([
      z.literal("mg"),
      z.literal("mcg"),
      z.literal("g"),
      z.literal("mL"),
      z.literal("drops"),
      z.literal("IU"),
      z.literal("%")
    ]),
    totalCount: z.number().optional(),
    dosageForm: z.union([
      z.literal("Tablet"),
      z.literal("Capsule"),
      z.literal("Softgel"),
      z.literal("Chewable Tablet"),
      z.literal("Gummy"),
      z.literal("Liquid"),
      z.literal("Syrup"),
      z.literal("Drops"),
      z.literal("Powder"),
      z.literal("Effervescent Tablet"),
      z.literal("Spray"),
      z.literal("Lozenge"),
      z.literal("Injection"),
      z.literal("Cream"),
      z.literal("Ointment"),
      z.literal("Gel"),
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
      // Regular frequencies
      z.literal("Once daily (OD)"),
      z.literal("Twice daily (BD)"),
      z.literal("Three times daily (TD)"),
      z.literal("Four times daily (QDS)"),
      z.literal("Four times daily (QIS)"),
      z.literal("As Needed (PRN)"),
      z.literal("One time (STAT)"),
      z.literal("Weekly"),
      z.literal("Monthly"),
      // Dosage units for PRN and Supplements
      z.literal("Tablets/Capsules"),
      z.literal("Drops"),
      z.literal("mL (Milliliters)"),
      z.literal("Puffs (Inhaler)"),
      z.literal("Applications (Topical)"),
      z.literal("Sprays"),
      z.literal("Patches"),
      z.literal("Sachets"),
      z.literal("Injections")
    ]).optional(),
    scheduleType: z.union([
      z.literal("Scheduled"),
      z.literal("PRN (As Needed)"),
      z.literal("Topical"),
      z.literal("Supplement")
    ]),
    times: z.array(z.string()).optional(),
    timeQuantities: z.record(z.string(), z.number().min(1)).optional(),
    prescriberName: z.string().optional(),
    instructions: z.string().optional(),
    startDate: z.date(),
    status: z.union([
      z.literal("active"),
      z.literal("completed"),
      z.literal("cancelled")
    ]),
    isControlledDrug: z.boolean().optional(),
    controlledDrugSchedule: z
      .union([z.literal("2"), z.literal("3"), z.literal("4"), z.literal("5")])
      .optional(),
    minIntervalHours: z.number().positive().optional(),
    maxDailyDose: z.number().positive().optional(),
    maxDailyDoseUnit: z.string().optional(),
    bodyRegions: z.array(z.string()).optional()
  })
  .refine(
    (data) => {
      // If scheduleType is "Scheduled", "Topical", or "Supplement", times must be provided
      // PRN medications don't need times
      if (
        data.scheduleType === "Scheduled" ||
        data.scheduleType === "Topical" ||
        data.scheduleType === "Supplement"
      ) {
        return data.times && data.times.length > 0;
      }
      // PRN doesn't require times
      return true;
    },
    {
      message: "At least one time is required",
      path: ["times"]
    }
  )
  .refine(
    (data) => {
      // Frequency is required for non-PRN and non-Supplement medications
      if (data.scheduleType !== "PRN (As Needed)" && data.scheduleType !== "Supplement") {
        return data.frequency !== undefined && data.frequency !== null;
      }
      // For PRN and Supplements, frequency field is used for dosage unit
      if (data.scheduleType === "PRN (As Needed)" || data.scheduleType === "Supplement") {
        return data.frequency !== undefined && data.frequency !== null;
      }
      return true;
    },
    {
      message: "Frequency/Dosage unit is required",
      path: ["frequency"]
    }
  )
  .refine(
    (data) => {
      // Body regions are required for topical medications
      if (data.scheduleType === "Topical") {
        return data.bodyRegions && data.bodyRegions.length > 0;
      }
      return true;
    },
    {
      message: "Please select at least one body region for topical medication",
      path: ["bodyRegions"]
    }
  );
