import { z } from "zod";

export const OnboardingProfileFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  imageUrl: z.string().optional(),
  phone: z.string().optional()
});
