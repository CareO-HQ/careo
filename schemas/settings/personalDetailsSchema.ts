import { z } from "zod";

export const personalDetailsSchema = z.object({
  imageUrl: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email()
});
