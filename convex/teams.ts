import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";

// Query to get a specific team by its ID
export const getTeam = query({
  args: {
    teamId: v.string()
  },
  handler: async (ctx, { teamId }) => {
    try {
      // Check if user is authenticated
      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );

      // Get the team using Better Auth
      const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "team",
        where: [{ field: "id", value: teamId }]
      });

      if (!team) {
        return null;
      }

      // Verify the team belongs to the user's current organization
      if (
        session.activeOrganizationId &&
        team.organizationId !== session.activeOrganizationId
      ) {
        throw new Error("Team not found in current organization");
      }

      // Get team memberships using the teamMembers table
      const teamMemberships = await ctx.db
        .query("teamMembers")
        .withIndex("byTeamId", (q) => q.eq("teamId", teamId))
        .collect();

      // Get full member information for each team membership
      const members = await Promise.all(
        teamMemberships.map(async (membership) => {
          try {
            // Get the member details from Better Auth using userId
            const member = await ctx.runQuery(
              components.betterAuth.lib.findOne,
              {
                model: "member",
                where: [{ field: "userId", value: membership.userId }]
              }
            );

            if (!member) {
              return null;
            }

            // Get the user details from Better Auth
            const user = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "user",
              where: [{ field: "id", value: membership.userId }]
            });

            return {
              id: member.id,
              userId: member.userId,
              email: user?.email || "",
              name: user?.name || "",
              image: user?.image || null,
              role: member.role || "",
              organizationId: member.organizationId,
              createdAt: member.createdAt,
              teamMembershipId: membership._id,
              teamRole: membership.role,
              addedToTeamAt: membership.createdAt,
              addedBy: membership.createdBy
            };
          } catch (error) {
            console.error(
              `Error getting member details for userId ${membership.userId}:`,
              error
            );
            return null;
          }
        })
      );

      // Filter out any null results from failed member lookups
      const validMembers = members.filter((member) => member !== null);

      return {
        id: team.id,
        name: team.name,
        organizationId: team.organizationId,
        createdAt: team.createdAt,
        members: validMembers,
        memberCount: validMembers.length
      };
    } catch (error) {
      console.error("Error getting team:", error);
      throw error;
    }
  }
});

// Simple query to get team name by ID without auth restrictions
export const getTeamName = query({
  args: {
    teamId: v.string()
  },
  handler: async (ctx, { teamId }) => {
    try {
      const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "team",
        where: [{ field: "id", value: teamId }]
      });

      return team ? { id: team.id, name: team.name } : null;
    } catch (error) {
      console.error("Error getting team name:", error);
      return null;
    }
  }
});

// Simple query to get organization name by ID
export const getOrganizationName = query({
  args: {
    organizationId: v.string()
  },
  handler: async (ctx, { organizationId }) => {
    try {
      const organization = await ctx.runQuery(
        components.betterAuth.lib.findOne,
        {
          model: "organization",
          where: [{ field: "id", value: organizationId }]
        }
      );

      return organization
        ? { id: organization.id, name: organization.name }
        : null;
    } catch (error) {
      console.error("Error getting organization name:", error);
      return null;
    }
  }
});

// Get all team members by teamId
export const getAllTeamMembersByTeamId = query({
  args: {
    teamId: v.string()
  },
  handler: async (ctx, { teamId }) => {
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", teamId))
      .collect();
    return teamMembers;
  }
});
