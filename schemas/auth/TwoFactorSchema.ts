import { z } from "zod";

export const TwoFactorSchema = z.object({
  code: z
    .string()
    .min(6, { message: "Code must be 6 digits" })
    .max(6, { message: "Code must be 6 digits" })
    .regex(/^\d+$/, { message: "Code must contain only numbers" })
});

export type TwoFactorFormData = z.infer<typeof TwoFactorSchema>;
