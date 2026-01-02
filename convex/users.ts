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
    workPermitStatus: v.optional(v.union(
      v.literal("citizen"),
      v.literal("work_permit")
    )),
    visaExpiryDate: v.optional(v.string()),
    rightToWorkStatus: v.optional(v.union(
      v.literal("verified"),
      v.literal("pending"),
      v.literal("expired"),
      v.literal("not_verified")
    )),
    nisccRegistrationNumber: v.optional(v.string()),
    nisccExpiryDate: v.optional(v.string()),
    rnNumber: v.optional(v.string()),
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
          nisccExpiryDate: localUser?.nisccExpiryDate,
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
    console.log("getByTeamId called with:", args.teamId);

    // Get all team members for this team
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    console.log("Found team members:", teamMembers.length);

    // Fetch all users
    const results: Array<Record<string, unknown>> = [];
    for (const teamMember of teamMembers) {
      const userId = teamMember.userId;

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

        results.push({
          _id: user?._id || authUser.id,
          userId: userId,
          _creationTime: user?._creationTime || Date.now(),
          email: authUser.email,
          name: user?.name || authUser.name,
          phone: user?.phone,
          imageUrl: userImage?.url || null,
          role: teamMember.role,
          teamId: teamMember.teamId,
          organizationId: teamMember.organizationId
        });
      }
    }

    console.log("Returning results:", results.length);
    return results;
  },
});