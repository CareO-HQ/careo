import { z } from "zod";

export const residentValuablesSchema = z.object({
  // Resident information
  residentName: z.string().min(1, "Resident name is required"),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  date: z.number(),
  completedBy: z.string().min(1, "Completed by is required"),
  witnessedBy: z.string().min(1, "Witnessed by is required"),

  // Valuables
  valuables: z.array(z.object({ value: z.string() })),

  // Money (n prefix for notes/coins to avoid numeric keys)
  n50: z.number().optional(),
  n20: z.number().optional(),
  n10: z.number().optional(),
  n5: z.number().optional(),
  n2: z.number().optional(),
  n1: z.number().optional(),
  p50: z.number().optional(),
  p20: z.number().optional(),
  p10: z.number().optional(),
  p5: z.number().optional(),
  p2: z.number().optional(),
  p1: z.number().optional(),
  total: z.number(),

  // Clothing
  clothing: z.array(z.object({ value: z.string() })),

  // Other
  other: z.array(
    z.object({
      details: z.string(),
      receivedBy: z.string(),
      witnessedBy: z.string(),
      date: z.number(),
      time: z.string()
    })
  )
});

export type ResidentValuablesFormValues = z.infer<
  typeof residentValuablesSchema
>;
