import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const updateUserOnboarding = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { name, phone, imageUrl } = args;

    // Get user from Better Auth
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("User not found");
    }

    // Update the Better Auth user table
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

    // Also update the Convex users table to keep data in sync
    const convexUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", user.email as string))
      .first();

    if (convexUser) {
      await ctx.db.patch(convexUser._id, {
        name: name,
        phone: phone || undefined,
        image: imageUrl || undefined
      });
    }

    return {
      success: true,
      updatedFields: { name, phone, imageUrl }
    };
  }
});

export const setIsOnboardingCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    // Get user from Better Auth
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("User not found");
    }

    // Find the user in Convex users table
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", userIdentity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found in Convex database");
    }

    // Update user table to mark onboarding as complete
    await ctx.db.patch(user._id, {
      isOnboardingComplete: true
    });

    return { success: true };
  }
});

export const getUserByEmail = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    const { email } = args;
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", email))
      .first();
    return user;
  }
});

// Get all users in the organization (for staff selection)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("name"), undefined))
      .collect();
    
    return users.map(user => ({
      _id: user._id,
      name: user.name || user.email.split('@')[0], // Fallback to email prefix if no name
      email: user.email
    }));
  }
});
