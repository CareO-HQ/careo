import {
  BetterAuth,
  type AuthFunctions,
  type PublicAuthFunctions
} from "@convex-dev/better-auth";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { action, mutation, query } from "./_generated/server";
import {
  adminAc,
  memberAc,
  ownerAc
} from "better-auth/plugins/organization/access";

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth;
const publicAuthFunctions: PublicAuthFunctions = api.auth;

// Role mapping for Better Auth organization plugin; managers inherit admin-like permissions
export const organizationRoles = {
  owner: ownerAc,
  admin: adminAc,
  manager: adminAc,
  nurse: memberAc,
  care_assistant: memberAc,
  member: memberAc
};

// Initialize the component
export const betterAuthComponent = new BetterAuth(components.betterAuth, {
  authFunctions,
  publicAuthFunctions,
  organization: {
    roles: organizationRoles
  }
} as any);

// These are required named exports
export const {
  createUser,
  updateUser,
  deleteUser,
  createSession,
  isAuthenticated
} = betterAuthComponent.createAuthFunctions<DataModel>({
  // Must create a user and return the user id
  onCreateUser: async (ctx, user) => {
    console.log("Creating user in Convex:", user);
    return ctx.db.insert("users", {
      email: user.email,
      name: user.name || undefined,
      image: user.image || undefined,
      isOnboardingComplete: false
    });
  },

  // Delete the user when they are deleted from Better Auth
  onDeleteUser: async (ctx, userId) => {
    await ctx.db.delete(userId as Id<"users">);
  },

  onCreateSession: async (ctx, session) => {
    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [{ field: "userId", value: session.userId }]
    });
    console.log("NEW SESSION", session, member);
    if (member) {
      session.activeOrganizationId = member.organizationId;
    }
  }
});

// Example function for getting the current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get user data from Better Auth - email, name, image, etc.
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      return null;
    }

    // Get the session to access activeOrganizationId
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    // Debug: Log the userMetadata to see what fields are available
    console.log("userMetadata from Better Auth:", userMetadata);
    console.log("twoFactorEnabled value:", userMetadata.twoFactorEnabled);
    console.log("session activeOrganizationId:", session?.activeOrganizationId);

    // Get user data from your application's database for custom fields
    const customUserData = await ctx.db.get(userMetadata.userId as Id<"users">);

    // Get active team details if activeTeamId exists
    let activeTeam: { id: any; name: any; organizationId?: any } | null = null;
    if (customUserData?.activeTeamId) {
      const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "team",
        where: [{ field: "id", value: customUserData.activeTeamId }]
      });
      if (team) {
        activeTeam = {
          id: team.id,
          name: team.name,
          organizationId: team.organizationId
        };
      }
    }

    // Get activeOrganizationId from session
    const activeOrganizationId = session?.activeOrganizationId || null;

    // Get active organization details if activeOrganizationId exists
    let activeOrganization: { id: any; name: any } | null = null;
    if (activeOrganizationId) {
      const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: activeOrganizationId }]
      });
      if (org) {
        activeOrganization = {
          id: org.id,
          name: org.name
        };
      }
    }

    // Better Auth user data takes precedence since we update it directly
    return {
      // Include all Better Auth fields first
      ...userMetadata,
      // Then override with explicit fields to ensure they take precedence
      id: userMetadata.id,
      email: userMetadata.email,
      twoFactorEnabled: userMetadata.twoFactorEnabled || false, // Provide default value
      name: userMetadata.name, // Use Better Auth name (updated by our mutation)
      image: userMetadata.image, // Use Better Auth image (updated by our mutation)
      phone: userMetadata.phoneNumber, // Use Better Auth phoneNumber
      isOnboardingComplete: customUserData?.isOnboardingComplete || false,
      activeTeamId: customUserData?.activeTeamId || null, // Include active team ID
      activeTeam: activeTeam, // Include active team details
      activeOrganizationId: activeOrganizationId, // Include active organization ID from session
      activeOrganization: activeOrganization, // Include active organization details
      // Include any other custom fields that aren't in Better Auth
      ...(customUserData && {
        customField1: customUserData.name, // Keep custom fields if needed
        customField2: customUserData.phone,
        customField3: customUserData.imageUrl
      })
    };
  }
});

// Send reset password email
export const sendResetPasswordEmail = action({
  args: {
    email: v.string(),
    url: v.string()
  },
  handler: async (ctx, { email, url }) => {
    console.log(email, url);
  }
});

export const updateUserOnboarding = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { name, phone, imageUrl } = args;
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );
    if (!session.userId) {
      throw new Error("Invalid user identity");
    }
    await ctx.runMutation(components.betterAuth.lib.updateOne, {
      input: {
        model: "user",
        where: [{ field: "id", value: session.userId as string }],
        update: {
          name: name,
          phoneNumber: phone || undefined,
          image: imageUrl || undefined
        }
      }
    });
    return {
      success: true,
      userId: session.userId,
      updatedFields: { name, phone, imageUrl }
    };
  }
});

// Mutation to update the active team for the user
export const updateActiveTeam = mutation({
  args: {
    teamId: v.string()
  },
  handler: async (ctx, { teamId }) => {
    console.log(`[TEAM-SWITCH] Starting team switch process for teamId: ${teamId}`);
    
    // Get the Better Auth user identity first to get the correct user ID
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("No active session found");
    }

    const betterAuthUserId = identity.subject;
    console.log(`[TEAM-SWITCH] User switching teams: ${betterAuthUserId} (${identity.email})`);

    // Get the session to find the active organization
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.activeOrganizationId) {
      throw new Error("No active organization found");
    }

    // Verify the team exists and belongs to the current organization
    const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "team",
      where: [{ field: "id", value: teamId }]
    });

    if (!team) {
      throw new Error("Team not found");
    }

    if (team.organizationId !== session.activeOrganizationId) {
      throw new Error("Team does not belong to the active organization");
    }

    // Get the email from identity to find the Convex user
    if (!identity.email) {
      throw new Error("User email not found in identity");
    }

    // Find the Convex user record by email (more reliable than using userMetadata.userId)
    const convexUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!convexUser) {
      throw new Error("User not found in Convex database");
    }

    const previousTeamId = convexUser.activeTeamId;
    console.log(`[TEAM-SWITCH] Previous team: ${previousTeamId || 'none'}, New team: ${teamId}`);

    // Update the activeTeamId in the Convex users table
    // This ensures the user's current team ID is updated (core functionality)
    await ctx.db.patch(convexUser._id, {
      activeTeamId: teamId
    });

    // Verify the update was successful
    const updatedUser = await ctx.db.get(convexUser._id);
    if (updatedUser?.activeTeamId !== teamId) {
      console.error(`WARNING: activeTeamId update may have failed. Expected: ${teamId}, Got: ${updatedUser?.activeTeamId}`);
    } else {
      console.log(`✓ Verified: Updated activeTeamId to ${teamId} for user ${convexUser.email} (${betterAuthUserId})`);
    }

    // Try to get the member record to get the role for teamMembers
    // If member lookup fails, we'll still proceed with team switching
    let member = null;
    try {
      member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: betterAuthUserId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });
      if (member) {
        console.log(`[TEAM-SWITCH] Found member record - role: ${member.role}`);
      }
    } catch (error) {
      console.warn(`[TEAM-SWITCH] Failed to find member record for user ${betterAuthUserId}:`, error);
    }

    // If member not found, try finding by userId only (might be in different org)
    if (!member) {
      try {
        const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "userId", value: betterAuthUserId }],
          paginationOpts: { cursor: null, numItems: 10 }
        });
        // Find member in the current organization
        member = members?.page?.find((m: any) => m.organizationId === session.activeOrganizationId) || null;
        if (member) {
          console.log(`[TEAM-SWITCH] Found member record via userId lookup - role: ${member.role}`);
        }
      } catch (error) {
        console.warn(`[TEAM-SWITCH] Failed to find member by userId only:`, error);
      }
    }

    // Log onboarding status
    const isOnboardingComplete = convexUser.isOnboardingComplete;
    const userRole = member?.role || "unknown";
    console.log(`[TEAM-SWITCH] User details - Role: ${userRole}, Onboarding Complete: ${isOnboardingComplete || false}`);

    // Ensure user is added to teamMembers table so managers can see them in staff list
    // This is critical for nurses and care assistants who switch teams
    // Check if user is already in this team
    const existingTeamMember = await ctx.db
      .query("teamMembers")
      .withIndex("byUserAndTeam", (q) =>
        q.eq("userId", betterAuthUserId).eq("teamId", teamId)
      )
      .first();

    // If not already in the team, add them to teamMembers table
    // If already in team, update the role if it's missing or incorrect
    // Role is optional in the schema, but we want to ensure it's set correctly
    const teamMemberRole = member?.role || undefined;
    
    if (!existingTeamMember) {
      console.log(`[TEAM-SWITCH] Adding user to teamMembers table:`, {
        userId: betterAuthUserId,
        email: identity.email,
        teamId: teamId,
        role: teamMemberRole,
        isOnboardingComplete: isOnboardingComplete || false,
        previousTeam: previousTeamId || 'none'
      });
      
      await ctx.db.insert("teamMembers", {
        userId: betterAuthUserId, // Use Better Auth user ID (identity.subject)
        teamId: teamId,
        organizationId: session.activeOrganizationId,
        role: teamMemberRole, // Optional - can be undefined if member not found
        email: identity.email, // Store email so we can find user in local table if Better Auth lookup fails
        createdAt: Date.now(),
        createdBy: betterAuthUserId
      });
      
      console.log(`[TEAM-SWITCH] ✓ Successfully added user ${betterAuthUserId} (${identity.email}) to team ${teamId}`);
    } else {
      // User is already in team - update role and email if they're missing or incorrect
      const currentRole = existingTeamMember.role;
      const currentEmail = existingTeamMember.email;
      const needsRoleUpdate = (!currentRole || currentRole === "unknown" || currentRole === "") && teamMemberRole;
      const needsEmailUpdate = !currentEmail && identity.email;
      
      if (needsRoleUpdate || needsEmailUpdate) {
        const updates: { role?: string; email?: string } = {};
        if (needsRoleUpdate) {
          updates.role = teamMemberRole;
        }
        if (needsEmailUpdate) {
          updates.email = identity.email;
        }
        
        console.log(`[TEAM-SWITCH] Updating existing teamMembers entry:`, {
          userId: betterAuthUserId,
          email: identity.email,
          teamId: teamId,
          oldRole: currentRole || 'missing',
          newRole: teamMemberRole,
          oldEmail: currentEmail || 'missing',
          newEmail: identity.email,
          updates
        });
        
        await ctx.db.patch(existingTeamMember._id, updates);
        
        console.log(`[TEAM-SWITCH] ✓ Successfully updated teamMembers entry for user ${betterAuthUserId} in team ${teamId}`);
      } else {
        // Even if no updates needed, log the current state for debugging
        console.log(`[TEAM-SWITCH] User ${betterAuthUserId} is already in team ${teamId}:`, {
          role: currentRole || 'not set',
          email: currentEmail || 'not set',
          availableRole: teamMemberRole || 'not available',
          availableEmail: identity.email || 'not available',
          note: needsRoleUpdate || needsEmailUpdate ? 'Update should have happened above' : 'No updates needed'
        });
      }
    }
    
    // Special logging for nurses and care assistants
    if (userRole === "nurse" || userRole === "care_assistant") {
      console.log(`[TEAM-SWITCH] ⚠ Nurse/Care Assistant team switch - Manager visibility:`, {
        role: userRole,
        isOnboardingComplete: isOnboardingComplete || false,
        willBeVisible: isOnboardingComplete === true,
        message: isOnboardingComplete === true 
          ? "Manager in new team will see this staff member"
          : "Manager in new team will NOT see this staff member (onboarding incomplete)"
      });
    }

    console.log(`[TEAM-SWITCH] ✓ Team switch completed successfully for ${betterAuthUserId} (${identity.email})`);
    return { success: true, activeTeamId: teamId };
  }
});

// Mutation to clear the active team (set to null)
export const clearActiveTeam = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the current user
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("No active session found");
    }

    const userId = userMetadata.userId as Id<"users">;
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(userId, {
      activeTeamId: undefined
    });

    return { success: true };
  }
});

// Mutation to set the active organization and clear active team
export const setActiveOrganization = mutation({
  args: {
    organizationId: v.string()
  },
  handler: async (ctx, { organizationId }) => {
    // Get the current session
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session.token) {
      throw new Error("No active session found");
    }

    // Get the current user
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("No active session found");
    }

    // First clear the active team since we're switching organizations
    const userId = userMetadata.userId as Id<"users">;
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(userId, {
      activeTeamId: undefined
    });

    // Update the session with the new active organization
    await ctx.runMutation(components.betterAuth.lib.updateOne, {
      input: {
        model: "session",
        where: [{ field: "token", value: session.token }],
        update: {
          activeOrganizationId: organizationId
        }
      }
    });

    return { success: true, organizationId, teamCleared: true };
  }
});

// Query to get teams with member counts for the current organization
export const getTeamsWithMembers = query({
  args: {},
  handler: async (ctx) => {
    try {
      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );

      if (!session || !session.token) {
        return []; // Return empty array if no session instead of throwing error
      }

      // Use provided organizationId or get from session
      const targetOrgId = session.activeOrganizationId;
      console.log("TARGET ORG ID", targetOrgId);

      if (!targetOrgId) {
        return [];
      }

      const teamsResult = await ctx.runQuery(
        components.betterAuth.lib.findMany,
        {
          model: "team",
          where: [{ field: "organizationId", value: targetOrgId }],
          paginationOpts: {
            cursor: null,
            numItems: 20
          }
        }
      );

      const teams = teamsResult?.page || [];
      console.log("Raw teams data:", teams);

      // Get member count for each team and return full team data
      const teamsWithMembers = await Promise.all(
        teams.map(
          async (team: {
            _id: string;
            name: string;
            organizationId: string;
            createdAt: number;
          }) => {
            try {
              console.log("Processing team:", {
                id: team._id,
                name: team.name
              });

              // Count members using our teamMembers table
              const teamMembers = await ctx.db
                .query("teamMembers")
                .withIndex("byTeamId", (q) => q.eq("teamId", team._id))
                .collect();

              const memberCount = teamMembers.length;

              // Ensure all fields are properly typed and not undefined
              const teamWithMembers = {
                id: team._id, // Remove || "" to ensure we get the actual ID
                name: team.name || "",
                organizationId: team.organizationId || "",
                createdAt: team.createdAt || 0,
                members: memberCount
              };

              console.log("Team with members:", teamWithMembers);
              return teamWithMembers;
            } catch (memberError) {
              console.error(
                `Error getting members for team ${team._id}:`,
                memberError
              );
              // Return team data with 0 members if member query fails
              const fallbackTeam = {
                id: team._id, // Remove || "" to ensure we get the actual ID
                name: team.name || "",
                organizationId: team.organizationId || "",
                createdAt: team.createdAt || 0,
                members: 0
              };
              console.log("Fallback team:", fallbackTeam);
              return fallbackTeam;
            }
          }
        )
      );

      return teamsWithMembers;
    } catch (error) {
      console.error("Error in getTeamsWithMembers:", error);
      return []; // Return empty array on any error to prevent UI crashes
    }
  }
});

// Simpler debug query to test if the issue is with the main query
export const getTeamsSimple = query({
  args: {},
  handler: async (ctx) => {
    try {
      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );

      if (!session || !session.token) {
        return [];
      }

      const targetOrgId = session.activeOrganizationId;

      if (!targetOrgId) {
        return [];
      }

      return [
        {
          id: "test-1",
          name: "Test Team 1",
          organizationId: targetOrgId,
          createdAt: Date.now(),
          members: 2
        },
        {
          id: "test-2",
          name: "Test Team 2",
          organizationId: targetOrgId,
          createdAt: Date.now(),
          members: 5
        }
      ];
    } catch (error) {
      console.error("Error in getTeamsSimple:", error);
      return [];
    }
  }
});

// Mutation to add a member to a team (supports multiple teams via teamMembers table)
export const addMemberToTeam = mutation({
  args: {
    memberId: v.string(),
    teamId: v.string()
  },
  handler: async (ctx, { memberId, teamId }) => {
    try {
      console.log("=== ADD MEMBER TO TEAM DEBUG ===");
      console.log("Input params:", { memberId, teamId });

      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );
      console.log("Session data:", {
        hasSession: !!session,
        hasToken: !!session?.token,
        activeOrganizationId: session?.activeOrganizationId
      });

      if (!session || !session.token) {
        throw new Error("Not authenticated");
      }

      // Verify the team exists and belongs to the current organization
      console.log("Looking up team with ID:", teamId);
      const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "team",
        where: [{ field: "id", value: teamId }]
      });
      console.log("Team found:", team);

      if (!team) {
        throw new Error("Team not found");
      }

      // Verify the member exists and belongs to the same organization
      console.log("Looking up member with ID:", memberId);
      const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [{ field: "id", value: memberId }]
      });
      console.log("Member found:", member);

      if (!member) {
        throw new Error("Member not found");
      }

      console.log("Organization comparison:");
      console.log("- Member organization ID:", member.organizationId);
      console.log("- Team organization ID:", team.organizationId);
      console.log(
        "- Session active organization ID:",
        session.activeOrganizationId
      );
      console.log(
        "- Organizations match:",
        member.organizationId === team.organizationId
      );

      if (member.organizationId !== team.organizationId) {
        console.error("ORGANIZATION MISMATCH!");
        console.error("Member belongs to:", member.organizationId);
        console.error("Team belongs to:", team.organizationId);
        throw new Error("Member and team must belong to the same organization");
      }

      // Check if this member is already in this team using our teamMembers table
      console.log("Checking for existing team membership...");
      const existingTeamMember = await ctx.db
        .query("teamMembers")
        .withIndex("byUserAndTeam", (q) =>
          q.eq("userId", member.userId).eq("teamId", teamId)
        )
        .first();

      if (existingTeamMember) {
        console.log("Member is already in this team");
        return {
          success: true,
          memberId,
          teamId,
          message: "Member already in team"
        };
      }

      // Get current user for createdBy field
      const currentUser = await betterAuthComponent.getAuthUser(ctx);

      // Get user email for teamMembers record
      let userEmail: string | undefined = undefined;
      try {
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: member.userId }]
        });
        userEmail = authUser?.email;
      } catch (error) {
        console.warn(`Failed to get user email for userId ${member.userId}:`, error);
      }

      // Create a new team membership record
      console.log("Creating new team membership...");
      await ctx.db.insert("teamMembers", {
        userId: member.userId,
        teamId: teamId,
        organizationId: member.organizationId,
        role: member.role, // Use the same role as the existing member
        email: userEmail, // Store email for fallback lookup
        createdAt: Date.now(),
        createdBy: currentUser?.userId || "system"
      });

      console.log("Successfully added member to team!");
      return { success: true, memberId, teamId };
    } catch (error) {
      console.error("Error adding member to team:", error);
      throw error;
    }
  }
});

// Mutation to remove a member from a team
export const removeMemberFromTeam = mutation({
  args: {
    memberId: v.string(),
    teamId: v.string()
  },
  handler: async (ctx, { memberId, teamId }) => {
    try {
      console.log("=== REMOVE MEMBER FROM TEAM DEBUG ===");
      console.log("Input params:", { memberId, teamId });

      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );

      if (!session || !session.token) {
        throw new Error("Not authenticated");
      }

      // Get the member to find their userId
      const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [{ field: "id", value: memberId }]
      });

      if (!member) {
        throw new Error("Member not found");
      }

      // Find the specific team membership record in our teamMembers table
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("byUserAndTeam", (q) =>
          q.eq("userId", member.userId).eq("teamId", teamId)
        )
        .first();

      if (!teamMember) {
        console.log("Member is not in this team");
        return {
          success: true,
          memberId,
          teamId,
          message: "Member not in team"
        };
      }

      // Remove the team membership
      await ctx.db.delete(teamMember._id);

      console.log("Successfully removed member from team!");
      return { success: true, memberId, teamId };
    } catch (error) {
      console.error("Error removing member from team:", error);
      throw error;
    }
  }
});

// Query to get all teams that a member belongs to
export const getMemberTeams = query({
  args: {
    memberId: v.string()
  },
  handler: async (ctx, { memberId }) => {
    try {
      // Get the member to find their userId
      const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [{ field: "id", value: memberId }]
      });

      if (!member) {
        return [];
      }

      // Find all team memberships for this user in our teamMembers table
      const teamMemberships = await ctx.db
        .query("teamMembers")
        .withIndex("byUserId", (q) => q.eq("userId", member.userId))
        .collect();

      // Get team details for each membership
      const teams = await Promise.all(
        teamMemberships.map(async (membership) => {
          const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "team",
            where: [{ field: "id", value: membership.teamId }]
          });

          return team
            ? {
              id: team.id,
              name: team.name,
              organizationId: team.organizationId,
              createdAt: team.createdAt,
              membershipId: membership._id
            }
            : null;
        })
      );

      return teams.filter((team) => team !== null);
    } catch (error) {
      console.error("Error getting member teams:", error);
      return [];
    }
  }
});

// Query to get teams for the current user (filtered by role)
export const getTeamsForCurrentUser = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    try {
      const session = await ctx.runQuery(
        components.betterAuth.lib.getCurrentSession
      );

      if (!session || !session.token) {
        return [];
      }

      const targetOrgId = session.activeOrganizationId;

      if (!targetOrgId) {
        return [];
      }

      // Get the current user's member record
      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: targetOrgId }
        ]
      });

      if (!currentMember) {
        return [];
      }

      // All roles (managers, owners, nurses, care assistants) can see all teams
      const teamsResult = await ctx.runQuery(
        components.betterAuth.lib.findMany,
        {
          model: "team",
          where: [{ field: "organizationId", value: targetOrgId }],
          paginationOpts: {
            cursor: null,
            numItems: 20
          }
        }
      );

      const teams = teamsResult?.page || [];
      return teams.map((team: any) => ({
        id: team.id || team._id,
        name: team.name,
        organizationId: team.organizationId,
        createdAt: team.createdAt || team._creationTime || 0,
      }));
    } catch (error) {
      console.error("Error in getTeamsForCurrentUser:", error);
      return [];
    }
  }
});
