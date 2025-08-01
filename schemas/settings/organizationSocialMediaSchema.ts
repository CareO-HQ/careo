import { z } from "zod";

export const organizationSocialMediaSchema = z.object({
  facebook: z.union([z.string().url(), z.literal("")]).optional(),
  instagram: z.union([z.string().url(), z.literal("")]).optional(),
  x: z.union([z.string().url(), z.literal("")]).optional(),
  linkedin: z.union([z.string().url(), z.literal("")]).optional()
});
