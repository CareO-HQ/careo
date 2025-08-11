import { z } from "zod";

export const CreateMultipleTeamsSchema = z.object({
  teams: z
    .array(
      z.object({
        name: z
          .string()
          .min(1, { message: "Team name is required" })
          .max(50, { message: "Team name must be less than 50 characters" })
      })
    )
    .min(1, { message: "At least one team is required" })
});
