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
      // Get team details
      const teamMembership = await ctx.db
        .query("teamMemberships")
        .withIndex("byUserAndTeam", (q) => 
          q.eq("userId", identity.subject).eq("teamId", user.activeTeamId)
        )
        .first();
      
      if (teamMembership) {
        // Get team name from teams table or from membership
        team = {
          id: teamMembership.teamId,
          name: user.activeTeamId, // Will be the actual team name
          organizationId: teamMembership.organizationId
        };
        
        organization = {
          id: teamMembership.organizationId,
          name: teamMembership.organizationId // For now, using ID as name
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