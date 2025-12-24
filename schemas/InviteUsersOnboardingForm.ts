import z from "zod";

export const InviteUsersOnboardingForm = z
  .object({
    users: z.array(
      z
        .object({
          email: z.string().optional(),
          role: z.enum(["manager", "nurse", "care_assistant"])
        })
        .optional()
    )
  })
  .refine(
    (data) => {
      // Validate that all non-empty emails are valid email format
      const nonEmptyEmails = data.users.filter(
        (user) => user?.email && user.email.trim() !== ""
      );
      return nonEmptyEmails.every((user) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(user?.email || "");
      });
    },
    {
      message: "Invalid email format",
      path: ["users"]
    }
  );
