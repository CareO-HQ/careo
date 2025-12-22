import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Auto-initialize superadmin on first deployment
 * This mutation checks if superadmin exists and creates it if not
 * Should be called automatically via Convex dashboard or scheduled job
 */
export const autoInitSuperAdmin = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const superAdminEmail = "jhonsonashik@gmail.com";

    // Check if superadmin already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", superAdminEmail))
      .first();

    if (existingUser?.isSaasAdmin) {
      return {
        success: true,
        message: `Superadmin ${superAdminEmail} already exists`,
      };
    }

    // If user exists but is not SaaS admin, mark them as one
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        isSaasAdmin: true,
        isOnboardingComplete: true,
      });

      return {
        success: true,
        message: `User ${superAdminEmail} marked as superadmin. Please ensure password is set via signup or reset.`,
      };
    }

    // User doesn't exist - they need to sign up first
    // The onCreateUser hook will create the Convex user record
    return {
      success: false,
      message: `User ${superAdminEmail} not found. Please sign up at /signup first, then run initializeSuperAdmin action.`,
    };
  },
});



