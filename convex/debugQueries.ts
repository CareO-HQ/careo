/**
 * Temporary debug queries to read organization and careHomes data
 * These can be called from the Convex dashboard or via API
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { components } from "./_generated/api";

/**
 * Get all organizations from Better Auth (no auth required for debugging)
 */
export const getAllOrganizationsDebug = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      slug: v.optional(v.string()),
      createdAt: v.optional(v.number()),
      metadata: v.optional(v.any())
    })
  ),
  handler: async (ctx) => {
    try {
      const organizations = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "organization",
        where: [],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      if (!organizations?.page) {
        return [];
      }

      return organizations.page.map((org: any) => ({
        id: org.id || org._id || String(org._id || ""),
        name: org.name || "",
        slug: org.slug,
        createdAt: org.createdAt,
        metadata: org.metadata
      }));
    } catch (error) {
      console.error("Error fetching organizations:", error);
      return [];
    }
  }
});

/**
 * Get all care homes from Convex careHomes table (no auth required for debugging)
 */
export const getAllCareHomesDebug = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    })
  ),
  handler: async (ctx) => {
    try {
      const careHomes = await ctx.db.query("careHomes").collect();
      
      return careHomes.map((ch) => ({
        _id: ch._id,
        organizationId: ch.organizationId,
        name: ch.name,
        createdBy: ch.createdBy,
        createdAt: ch.createdAt
      }));
    } catch (error) {
      console.error("Error fetching care homes:", error);
      return [];
    }
  }
});

/**
 * Find orphaned care homes (care homes with organizationIds that don't exist)
 */
export const findOrphanedCareHomes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdAt: v.number(),
      reason: v.string()
    })
  ),
  handler: async (ctx) => {
    try {
      const careHomes = await ctx.db.query("careHomes").collect();
      const orphaned: Array<{
        _id: any;
        organizationId: string;
        name: string;
        createdAt: number;
        reason: string;
      }> = [];

      for (const careHome of careHomes) {
        // Check if organization exists
        const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "organization",
          where: [{ field: "id", value: careHome.organizationId }]
        });

        if (!org) {
          orphaned.push({
            _id: careHome._id,
            organizationId: careHome.organizationId,
            name: careHome.name,
            createdAt: careHome.createdAt,
            reason: `Organization ${careHome.organizationId} does not exist in Better Auth`
          });
        }
      }

      return orphaned;
    } catch (error) {
      console.error("Error finding orphaned care homes:", error);
      return [];
    }
  }
});

/**
 * Get organizations with their associated care homes
 */
export const getOrganizationsWithCareHomes = query({
  args: {},
  returns: v.array(
    v.object({
      organization: v.object({
        id: v.string(),
        name: v.string(),
        slug: v.optional(v.string())
      }),
      careHomes: v.array(
        v.object({
          _id: v.id("careHomes"),
          name: v.string(),
          createdAt: v.number()
        })
      )
    })
  ),
  handler: async (ctx) => {
    // Get all organizations
    const orgsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    if (!orgsResult?.page) {
      return [];
    }

    // Get all care homes
    const careHomes = await ctx.db.query("careHomes").collect();

    // Group care homes by organization
    return orgsResult.page.map((org: any) => {
      const orgCareHomes = careHomes
        .filter((ch) => ch.organizationId === (org.id || org._id))
        .map((ch) => ({
          _id: ch._id,
          name: ch.name,
          createdAt: ch.createdAt
        }));

      return {
        organization: {
          id: org.id || org._id,
          name: org.name || "",
          slug: org.slug
        },
        careHomes: orgCareHomes
      };
    });
  }
});
