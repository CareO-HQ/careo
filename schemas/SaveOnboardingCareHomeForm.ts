import z from "zod";

export const SaveOnboardingCareHomeForm = z.object({
  name: z.string().min(1, { message: "Add a name for your care home" }),
  exampleData: z.boolean().optional()
});
