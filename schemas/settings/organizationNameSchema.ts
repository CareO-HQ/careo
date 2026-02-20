import { z } from "zod";

export const organizationNameSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().optional()
});
