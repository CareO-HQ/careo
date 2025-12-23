import z from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["manager", "nurse", "care_assistant"])
});
