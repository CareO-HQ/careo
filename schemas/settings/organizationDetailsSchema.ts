import { z } from "zod";

export const organizationDetailsSchema = z.object({
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  website: z.union([z.string().url(), z.literal("")]).optional()
});
