import { z } from "zod";

// At least 8 characters, one capital, one number, one special character
export const NewPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
});
