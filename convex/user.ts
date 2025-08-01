import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

export const updateUserOnboarding = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { name, phone, imageUrl } = args;

    // Get user from db
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("User not found");
    }

    // Update the Better Auth user table using the userId from the session
    await ctx.runMutation(components.betterAuth.lib.updateOne, {
      input: {
        model: "user",
        where: [{ field: "email", value: user.email as string }],
        update: {
          name: name,
          phoneNumber: phone || undefined,
          image: imageUrl || undefined
        }
      }
    });

    return {
      success: true,
      updatedFields: { name, phone, imageUrl }
    };
  }
});


