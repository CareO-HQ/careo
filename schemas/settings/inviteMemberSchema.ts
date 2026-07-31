import z from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["manager", "nurse", "care_assistant", "mdt", "rqia", "kitchen_staff"]),
  teamId: z.string().optional()
});
