import { v } from "convex/values";
import { query } from "./_generated/server";

export const getCurrentUserContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return null;
    }

    // Get the active team if set
    let team = null;
    let organization = null;
    
    if (user.activeTeamId) {
      // Get team membership details
      const teamMembership = await ctx.db
        .query("teamMemberships")
        .withIndex("byUserAndTeam", (q) => 
          q.eq("userId", identity.subject).eq("teamId", user.activeTeamId)
        )
        .first();
      
      if (teamMembership) {
        team = {
          id: teamMembership.teamId,
          name: user.activeTeamId // Use the team ID as name for now
        };
        
        organization = {
          id: teamMembership.organizationId,
          name: teamMembership.organizationId // Use organization ID as name for now
        };
      } else {
        // Fallback if no membership found
        team = {
          id: user.activeTeamId,
          name: user.activeTeamId
        };
      }
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        activeTeamId: user.activeTeamId
      },
      team,
      organization
    };
  },
});