// Development helper functions - DO NOT use in production
import { mutation } from "./_generated/server";
import { components } from "./_generated/api";

/**
 * DANGER: Clears all BetterAuth sessions
 * Use this when you need to force logout all users during development
 */
export const clearAllSessions = mutation({
  args: {},
  handler: async (ctx) => {
    // This will clear all sessions from BetterAuth
    const sessions = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "session",
      paginationOpts: {
        cursor: null,
        numItems: 100
      }
    });

    let deletedCount = 0;

    if (sessions?.page) {
      for (const session of sessions.page) {
        try {
          await ctx.runMutation(components.betterAuth.lib.deleteOne, {
            model: "session",
            where: [{ field: "id", value: session.id }]
          });
          deletedCount++;
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    }

    return {
      success: true,
      deletedCount
    };
  }
});
