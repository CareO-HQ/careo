import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("byUserAndTeam", (q) =>
          q.eq("userId", identity.subject).eq("teamId", user.activeTeamId!)
        )
        .first();

      if (teamMember) {
        team = {
          id: teamMember.teamId,
          name: teamMember.teamId // Use the team ID as name for now
        };

        organization = {
          id: teamMember.organizationId,
          name: teamMember.organizationId // Use organization ID as name for now
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

// Get all users in an organization
export const getByOrganization = query({
  args: {
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    console.log("getByOrganization called with:", args.organizationId);

    // Get all team members for this organization
    const teamMembers = await ctx.db
      .query("teamMembers")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    console.log("Found team members:", teamMembers.length);

    // Get unique user IDs (these are auth subject IDs)
    const userIds = [...new Set(teamMembers.map(tm => tm.userId))];
    console.log("Unique user IDs:", userIds);

    // Fetch all users using better-auth
    const results: Array<Record<string, unknown>> = [];
    for (const userId of userIds) {
      // Use better-auth to find user by ID
      const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "id", value: userId }]
      });

      if (authUser) {
        // Get our local user record
        const user = await ctx.db
          .query("users")
          .withIndex("byEmail", (q) => q.eq("email", authUser.email))
          .first();

        // Get user's image if available
        const userImage: { url: string | null; storageId: string } | null =
          await ctx.runQuery(api.files.image.getUserImageByUserId, {
            userId: userId
          });

        // Get user's team memberships in this organization
        const userTeamMemberships = teamMembers.filter(tm => tm.userId === userId);

        // Get role from first team membership
        const role = userTeamMemberships[0]?.role;

        results.push({
          _id: user?._id || authUser.id,
          _creationTime: user?._creationTime || Date.now(),
          email: authUser.email,
          name: user?.name || authUser.name,
          phone: user?.phone,
          imageUrl: userImage?.url || null,
          role: role,
          teamMemberships: userTeamMemberships
        });
      }
    }

    console.log("Returning results:", results.length);
    return results;
  },
});

// Get staff details by user ID (for local users table data)
export const getStaffDetailsByUserId = query({
  args: {
    userId: v.string() // Better-auth user ID
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Find user by better-auth user ID through email lookup
    const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: args.userId }]
    });

    if (!authUser) {
      return null;
    }

    // Get our local user record with staff details
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", authUser.email))
      .first();

    return user || null;
  },
});

// Update staff details
export const updateStaffDetails = mutation({
  args: {
    userId: v.string(), // Better-auth user ID
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfJoin: v.optional(v.string()),
    rightToWorkStatus: v.optional(v.union(
      v.literal("verified"),
      v.literal("pending"),
      v.literal("expired"),
      v.literal("not_verified")
    )),
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    nextOfKinEmail: v.optional(v.string()),
    nextOfKinAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args;

    // Find user by better-auth user ID
    const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: userId }]
    });

    if (!authUser) {
      throw new Error("User not found");
    }

    // Get our local user record
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", authUser.email))
      .first();

    if (!user) {
      throw new Error("User record not found in local database");
    }

    // Update the user record with staff details
    await ctx.db.patch(user._id, updateData);

    // Also update phone in better-auth if provided
    if (updateData.phone) {
      await ctx.runMutation(components.betterAuth.lib.updateOne, {
        input: {
          model: "user",
          where: [{ field: "id", value: userId }],
          update: {
            phoneNumber: updateData.phone
          }
        }
      });
    }

    return { success: true, userId: user._id };
  },
});

// Get enriched organization members with extended fields (phone, etc.)
export const getEnrichedOrgMembers = query({
  args: {
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    // Get organization members from better-auth
    const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 100
      }
    });

    const members = membersResult?.page || [];
    const results: Array<Record<string, unknown>> = [];

    for (const member of members) {
      // Get user details from better-auth
      const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "id", value: member.userId }]
      });

      if (authUser) {
        // Get our local user record with extended fields
        const localUser = await ctx.db
          .query("users")
          .withIndex("byEmail", (q) => q.eq("email", authUser.email))
          .first();

        // Get user's image
        const userImage: { url: string | null; storageId: string } | null =
          await ctx.runQuery(api.files.image.getUserImageByUserId, {
            userId: member.userId
          });

        // Get team name from activeTeamId if available
        let teamName: string | undefined = undefined;
        if (localUser?.activeTeamId) {
          try {
            const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "team",
              where: [{ field: "id", value: localUser.activeTeamId }]
            });
            teamName = team?.name;
          } catch (error) {
            console.warn(`[getEnrichedOrgMembers] Failed to fetch team name for teamId ${localUser.activeTeamId}:`, error);
          }
        }

        results.push({
          id: member.id,
          userId: member.userId,
          role: member.role,
          organizationId: member.organizationId,
          createdAt: member.createdAt,
          user: {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            image: userImage?.url || authUser.image,
          },
          // Extended fields from local database
          phone: localUser?.phone,
          address: localUser?.address,
          dateOfJoin: localUser?.dateOfJoin,
          rightToWorkStatus: localUser?.rightToWorkStatus,
          teamName: teamName, // Include team name so managers can see which unit/house each staff member belongs to
          activeTeamId: localUser?.activeTeamId, // Include activeTeamId for reference
        });
      }
    }

    return results;
  },
});

// Get all users in a specific team
export const getByTeamId = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    console.log("getByTeamId called with teamId:", args.teamId);

    // Get all team members for this team from local table
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    console.log(`[getByTeamId] Found ${teamMembers.length} team members in local table for team ${args.teamId}`);
    if (teamMembers.length > 0) {
      console.log(`[getByTeamId] Team member userIds:`, teamMembers.map(tm => tm.userId));
      console.log(`[getByTeamId] Team member details:`, teamMembers.map(tm => ({ userId: tm.userId, role: tm.role, teamId: tm.teamId })));
    } else {
      console.log(`[getByTeamId] WARNING: No team members found in teamMembers table for team ${args.teamId}`);
    }

    // Fetch all users and filter by activeTeamId
    // Only show users whose activeTeamId matches the requested teamId
    // This ensures that when nurses/care assistants switch teams, they only appear in their current team
    const results: Array<Record<string, unknown>> = [];
    for (const teamMember of teamMembers) {
      const userId = teamMember.userId;

      console.log(`Processing team member with userId: ${userId}`);

      // Try multiple methods to get user from Better Auth
      let authUser = null;
      
      // Method 1: Try findOne with id field
      try {
        authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: userId }]
        });
        if (authUser) {
          console.log(`[getByTeamId] ✓ Found user via findOne with id: ${authUser.email}`);
        }
      } catch (error) {
        console.warn(`[getByTeamId] findOne with id failed for userId ${userId}:`, error);
      }

      // Method 2: If that fails, try findMany and get first result
      if (!authUser) {
        try {
          const usersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "user",
            where: [{ field: "id", value: userId }],
            paginationOpts: { cursor: null, numItems: 1 }
          });
          if (usersResult?.page && usersResult.page.length > 0) {
            authUser = usersResult.page[0];
            console.log(`[getByTeamId] ✓ Found user via findMany: ${authUser.email}`);
          }
        } catch (error) {
          console.warn(`[getByTeamId] findMany failed for userId ${userId}:`, error);
        }
      }

      // Method 3: If still no user, try to use email from teamMember or find user in local table by other means
      if (!authUser) {
        console.log(`[getByTeamId] User not found via Better Auth, trying fallback methods...`);
        let teamMemberEmail = teamMember.email;
        
        // If email not in teamMember, try to find user in local table by querying all users
        // and matching by checking if any user has this userId in their teamMembers
        if (!teamMemberEmail) {
          console.log(`[getByTeamId] Email not in teamMember, trying to find user in local table...`);
          
          // Try to find user by checking all teamMembers with this userId to get organization context
          // Then try to find the user by querying local users table
          // Actually, we can't easily match userId to email without Better Auth
          // So we'll need to skip this user until teamMembers is updated with email
          console.log(`[getByTeamId] ⚠️ Cannot find user without email - teamMember entry for userId ${userId} needs email update`);
          console.log(`[getByTeamId] Suggestion: User should switch teams again to trigger email update in teamMembers`);
          continue;
        }
        
        if (teamMemberEmail) {
          // Try to find user in local Convex table by email
          const localUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", teamMemberEmail!))
            .first();
          
          if (localUser) {
            // Create a minimal authUser object from local user data
            authUser = {
              id: userId,
              email: localUser.email,
              name: localUser.name || undefined,
              image: localUser.image || undefined
            };
            console.log(`[getByTeamId] ✓ Found user via local table using email from teamMember: ${teamMemberEmail}`);
          } else {
            console.log(`[getByTeamId] ⚠️ User not found in local table either for email: ${teamMemberEmail}`);
            continue;
          }
        }
      }

      // Get our local user record to check activeTeamId
      const user = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", authUser.email))
        .first();

      console.log(`[getByTeamId] User record for ${authUser.email}:`, {
        found: !!user,
        activeTeamId: user?.activeTeamId,
        isOnboardingComplete: user?.isOnboardingComplete,
        requestedTeamId: args.teamId
      });

      // Filter logic: 
      // Show users if they're in teamMembers for this team AND:
      // 1. Their activeTeamId matches the requested teamId (they're currently active in this team), OR
      // 2. Their activeTeamId is null/undefined (they haven't switched teams yet - show in original team), OR
      // 3. User record not found (fallback - show them)
      // 
      // Exclude users ONLY if activeTeamId is explicitly set to a DIFFERENT team (they switched away)
      const userActiveTeamId = user?.activeTeamId;
      const shouldExclude = userActiveTeamId !== null && userActiveTeamId !== undefined && userActiveTeamId !== args.teamId;
      
      console.log(`[getByTeamId] Filter check for ${authUser.email}:`, {
        userActiveTeamId,
        requestedTeamId: args.teamId,
        shouldExclude,
        reason: shouldExclude ? `activeTeamId (${userActiveTeamId}) != requested teamId (${args.teamId})` : 'passing activeTeamId filter'
      });

      if (shouldExclude) {
        console.log(`[FILTER] Excluding user ${userId} (${authUser.email}) - activeTeamId (${userActiveTeamId}) != requested teamId (${args.teamId})`);
        continue;
      }

      // Include this user (passed activeTeamId filter)
      const inclusionReason = !user
        ? "user record not found (fallback)"
        : !userActiveTeamId
          ? "no activeTeamId set (original team)"
          : userActiveTeamId === args.teamId
            ? "activeTeamId matches"
            : "unknown";
      console.log(`[INCLUDE] User ${userId} (${authUser.email}) - Reason: ${inclusionReason}, activeTeamId: ${userActiveTeamId || 'null'}, teamId: ${args.teamId}`);

      // Get user role from teamMember (fallback to member record if teamMember.role is missing)
      let userRole = teamMember.role;
      
      // If role is missing from teamMember, try to get it from member record
      if (!userRole || userRole === "unknown" || userRole === "") {
        console.log(`[getByTeamId] Role missing in teamMember for ${authUser.email}, trying to get from member record...`);
        try {
          const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "member",
            where: [
              { field: "userId", value: userId },
              { field: "organizationId", value: teamMember.organizationId }
            ]
          });
          if (member?.role) {
            userRole = member.role;
            console.log(`[getByTeamId] Found role from member record: ${userRole}`);
          }
        } catch (error) {
          console.warn(`[getByTeamId] Failed to get role from member record:`, error);
        }
      }
      
      const isOnboardingComplete = user?.isOnboardingComplete;

      console.log(`[getByTeamId] Onboarding check for ${authUser.email}:`, {
        role: userRole,
        roleSource: teamMember.role ? 'teamMember' : 'member record',
        isOnboardingComplete,
        userRecordExists: !!user
      });

      // Filter by onboarding status:
      // - Nurses and care assistants: only include if isOnboardingComplete === true
      // - Managers and owners: always include (regardless of onboarding status)
      const isNurseOrCareAssistant = userRole === "nurse" || userRole === "care_assistant";
      const isManagerOrOwner = userRole === "manager" || userRole === "owner";

      if (isNurseOrCareAssistant) {
        if (isOnboardingComplete !== true) {
          console.log(`[FILTER-ONBOARDING] ❌ EXCLUDING ${userRole} ${userId} (${authUser.email}) - isOnboardingComplete: ${isOnboardingComplete || 'false/undefined'}`);
          continue;
        }
        console.log(`[FILTER-ONBOARDING] ✅ INCLUDING ${userRole} ${userId} (${authUser.email}) - isOnboardingComplete: true`);
      } else if (isManagerOrOwner) {
        console.log(`[FILTER-ONBOARDING] ✅ INCLUDING ${userRole} ${userId} (${authUser.email}) - managers/owners always visible (isOnboardingComplete: ${isOnboardingComplete || 'undefined'})`);
      } else {
        // Unknown role - log for debugging but include by default
        console.log(`[FILTER-ONBOARDING] ⚠️ INCLUDING user ${userId} (${authUser.email}) with unknown role: ${userRole || 'undefined'} (isOnboardingComplete: ${isOnboardingComplete || 'undefined'})`);
      }

      // Get user's image if available
      const userImage: { url: string | null; storageId: string } | null =
        await ctx.runQuery(api.files.image.getUserImageByUserId, {
          userId: userId
        });

      // Get team name for this team member
      let teamName: string | undefined = undefined;
      try {
        const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "team",
          where: [{ field: "id", value: teamMember.teamId }]
        });
        teamName = team?.name;
      } catch (error) {
        console.warn(`[getByTeamId] Failed to fetch team name for teamId ${teamMember.teamId}:`, error);
      }

      results.push({
        _id: user?._id || authUser.id,
        userId: userId,
        _creationTime: user?._creationTime || Date.now(),
        email: authUser.email,
        name: user?.name || authUser.name,
        phone: user?.phone,
        imageUrl: userImage?.url || null,
        role: userRole,
        teamId: teamMember.teamId,
        teamName: teamName, // Include team name so managers can see which unit/house each staff member belongs to
        organizationId: teamMember.organizationId
      });
    }

    // Log final results breakdown by role
    const roleBreakdown: Record<string, number> = {};
    results.forEach((result) => {
      const role = (result.role as string) || "unknown";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    });
    console.log(`[FINAL] Returning ${results.length} results (filtered by activeTeamId and onboarding status)`);
    console.log(`[FINAL] Role breakdown:`, roleBreakdown);
    return results;
  },
});

export const inspectData = query({
  args: {},
  handler: async (ctx) => {
    const teamMembers = await ctx.db.query("teamMembers").collect();

    // Check users with activeTeamId
    const usersWithTeam = await ctx.db.query("users")
      .filter(q => q.neq(q.field("activeTeamId"), undefined))
      .collect();

    return {
      teamMembersCount: teamMembers.length,
      usersWithTeamCount: usersWithTeam.length,
      usersSample: usersWithTeam.slice(0, 5).map(u => ({ id: u._id, activeTeamId: u.activeTeamId })),
    };
  },
});