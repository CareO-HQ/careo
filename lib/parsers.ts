import { z } from "zod";

export const filterItemSchema = z.object({
  id: z.string(),
  value: z.any(),
  operator: z.string().optional(),
  variant: z.string().optional(),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;
