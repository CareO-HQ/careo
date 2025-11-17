import { v } from "convex/values";
import { query } from "./_generated/server";
import { components } from "./_generated/api";

// Get all organizations (for super admin)
export const getAllOrganizations = query({
  args: {},
  handler: async (ctx) => {
    // Get all organizations from Better Auth component
    const orgsResult = await ctx.runQuery(
      components.betterAuth.lib.findMany,
      {
        model: "organization",
        where: [],
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
      }
    );

    const orgs = orgsResult?.page || [];

    return orgs.map((org: any) => ({
      id: org.id || org._id,
      name: org.name,
      createdAt: org.createdAt,
    }));
  },
});

// Get user's role and check if super admin
export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.userId) {
      return null;
    }

    // Get member record to check role
    const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [{ field: "userId", value: session.userId }],
    });

    return {
      role: member?.role || "user",
      isSuperAdmin: member?.role === "super_admin" || member?.role === "superadmin",
      organizationId: member?.organizationId,
    };
  },
});
