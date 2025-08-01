import { z } from "zod";

export const updateTeamSchema = z.object({
  name: z.string().min(1)
});
