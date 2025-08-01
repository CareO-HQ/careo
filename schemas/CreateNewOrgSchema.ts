import z from "zod";

export const CreateNewOrgSchema = z.object({
  name: z.string().min(1, { message: "Add a name for your organization" })
});
