import { z } from "zod";

export const CreateMedicationSchema = z.object({
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
  scheduleType: z.union([z.literal("Scheduled"), z.literal("PRN (As Needed)")]),
  times: z.array(z.string()).min(1),
  instructions: z.string().optional(),
  prescriberId: z.string(),
  prescriberName: z.string(),
  prescribedAt: z.number(),
  startDate: z.number(),
  endDate: z.number().optional(),
  status: z.union([
    z.literal("active"),
    z.literal("completed"),
    z.literal("cancelled")
  ])
});
