import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/authHelpers";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Query to check if current user is SaaS admin
 */
export const getCurrentUserSaasAdminStatus = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      const user = await getAuthenticatedUser(ctx);
      return user.isSaasAdmin === true;
    } catch {
      return false;
    }
  },
});

/**
 * Get all organizations (SaaS admin only)
 */
export const getAllOrganizations = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      createdAt: v.number(),
      memberCount: v.number(),
      teamCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    if (!user.isSaasAdmin) {
      throw new Error("Unauthorized: SaaS admin access required");
    }

    // Get all organizations from Better Auth
    const orgs = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
    });

    // Get member and team counts for each organization
    const orgsWithCounts = await Promise.all(
      (orgs.page || []).map(async (org: any) => {
        const members = await ctx.runQuery(
          components.betterAuth.lib.findMany,
          {
            model: "member",
            where: [{ field: "organizationId", value: org.id }],
            paginationOpts: {
              cursor: null,
              numItems: 1000,
            },
          }
        );

        const teams = await ctx.runQuery(
          components.betterAuth.lib.findMany,
          {
            model: "team",
            where: [{ field: "organizationId", value: org.id }],
            paginationOpts: {
              cursor: null,
              numItems: 1000,
            },
          }
        );

        return {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          memberCount: members.page?.length || 0,
          teamCount: teams.page?.length || 0,
        };
      })
    );

    return orgsWithCounts;
  },
});

/**
 * Get all users across all organizations (SaaS admin only)
 */
export const getAllUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
      isSaasAdmin: v.optional(v.boolean()),
      isOnboardingComplete: v.optional(v.boolean()),
      organizationId: v.optional(v.string()),
      role: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    if (!user.isSaasAdmin) {
      throw new Error("Unauthorized: SaaS admin access required");
    }

    // Get all users from Convex
    const allUsers = await ctx.db.query("users").collect();

    // Get organization and role info for each user
    const usersWithOrgInfo = await Promise.all(
      allUsers.map(async (convexUser) => {
        // Get Better Auth user ID (email match)
        const betterAuthUser = await ctx.runQuery(
          components.betterAuth.lib.findOne,
          {
            model: "user",
            where: [{ field: "email", value: convexUser.email }],
          }
        );

        let organizationId: string | undefined;
        let role: string | undefined;

        if (betterAuthUser) {
          const member = await ctx.runQuery(
            components.betterAuth.lib.findOne,
            {
              model: "member",
              where: [{ field: "userId", value: betterAuthUser.id }],
            }
          );

          if (member) {
            organizationId = member.organizationId;
            role = member.role;
          }
        }

        return {
          _id: convexUser._id,
          email: convexUser.email,
          name: convexUser.name,
          isSaasAdmin: convexUser.isSaasAdmin,
          isOnboardingComplete: convexUser.isOnboardingComplete,
          organizationId,
          role,
        };
      })
    );

    return usersWithOrgInfo;
  },
});

/**
 * Mark a user as SaaS admin (SaaS admin only)
 */
export const markUserAsSaasAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    if (!currentUser.isSaasAdmin) {
      throw new Error("Unauthorized: SaaS admin access required");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      isSaasAdmin: true,
      isOnboardingComplete: true, // SaaS admins skip onboarding
    });

    return {
      success: true,
      message: `User ${targetUser.email} has been marked as SaaS admin`,
    };
  },
});

/**
 * Remove SaaS admin status from a user (SaaS admin only)
 */
export const removeSaasAdminStatus = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    if (!currentUser.isSaasAdmin) {
      throw new Error("Unauthorized: SaaS admin access required");
    }

    // Prevent removing your own SaaS admin status
    if (currentUser._id === args.userId) {
      throw new Error("Cannot remove your own SaaS admin status");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      isSaasAdmin: false,
    });

    return {
      success: true,
      message: `SaaS admin status removed from ${targetUser.email}`,
    };
  },
});

/**
 * Public mutation to mark a user as SaaS admin
 * This can be called from Convex dashboard or via API
 * 
 * Usage:
 * 1. First, create the user via regular signup at /signup
 * 2. Then call this mutation with the user's email
 * 
 * Note: This should ideally be called only once for the first SaaS admin.
 * After that, use markUserAsSaasAdmin mutation from the SaaS admin dashboard.
 */
export const seedSaasAdmin = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.id("users")),
  }),
  handler: async (ctx, args) => {
    // Check if SaaS admin already exists
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSaasAdmin"), true))
      .first();

    if (existingAdmin) {
      return {
        success: false,
        message:
          "A SaaS admin already exists. Use markUserAsSaasAdmin from the SaaS admin dashboard instead.",
        userId: existingAdmin._id,
      };
    }

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return {
        success: false,
        message:
          "User not found. Please sign up first at /signup, then run this function again.",
        userId: undefined,
      };
    }

    // Mark user as SaaS admin
    await ctx.db.patch(user._id, {
      isSaasAdmin: true,
      isOnboardingComplete: true,
    });

    return {
      success: true,
      message: `User ${args.email} has been marked as SaaS admin. You can now login at /saas-admin/login`,
      userId: user._id,
    };
  },
});

/**
 * Check if SaaS admin exists (internal version for actions)
 */
export const checkSaasAdminExists = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const saasAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSaasAdmin"), true))
      .first();
    return !!saasAdmin;
  },
});

/**
 * Get user by email (internal version for initialization)
 */
export const getUserByEmailForInit = internalQuery({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      isSaasAdmin: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      isSaasAdmin: user.isSaasAdmin,
    };
  },
});

/**
 * Seed SaaS admin (internal version for initialization)
 */
export const seedSaasAdminInternal = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    userId: v.optional(v.id("users")),
  }),
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return {
        success: false,
        message: "User not found. Please sign up first.",
        userId: undefined,
      };
    }

    // Mark user as SaaS admin
    await ctx.db.patch(user._id, {
      isSaasAdmin: true,
      isOnboardingComplete: true,
    });

    return {
      success: true,
      message: `User ${args.email} has been marked as SaaS admin`,
      userId: user._id,
    };
  },
});

/**
 * Get SaaS admin dashboard stats
 */
export const getSaasAdminStats = query({
  args: {},
  returns: v.object({
    totalOrganizations: v.number(),
    totalUsers: v.number(),
    totalSaasAdmins: v.number(),
    totalResidents: v.number(),
  }),
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    if (!user.isSaasAdmin) {
      throw new Error("Unauthorized: SaaS admin access required");
    }

    // Get all organizations
    const orgs = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
    });

    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    // Get SaaS admins
    const saasAdmins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isSaasAdmin"), true))
      .collect();

    // Get all residents
    const residents = await ctx.db.query("residents").collect();

    return {
      totalOrganizations: orgs.page?.length || 0,
      totalUsers: allUsers.length,
      totalSaasAdmins: saasAdmins.length,
      totalResidents: residents.length,
    };
  },
});

