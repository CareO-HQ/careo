/**
 * Organization Management Mutations
 * 
 * Handles organization creation (SaaS Admin only).
 * Organizations are created in Better Auth, this module provides
 * the RBAC wrapper around Better Auth organization creation.
 * 
 * NOTE: This function ONLY creates organizations in Better Auth.
 * Care homes are NOT created automatically - owners create them during onboarding
 * or through the dashboard sidebar.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { canCreateOrganization, resolveUser } from "../lib/rbac";
import { components } from "../_generated/api";

/**
 * Create a new organization (SaaS Admin only)
 * 
 * Creates an organization in Better Auth and returns the organization ID.
 * Only SaaS Admins can create organizations.
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string())
  },
  returns: v.object({
    organizationId: v.string(),
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Check permission
    const canCreate = await canCreateOrganization(ctx);
    if (!canCreate) {
      throw new Error("Unauthorized: Only SaaS Admin can create organizations");
    }

    // Get current user for audit
    const { user } = await resolveUser(ctx);

    // Create organization in Better Auth
    const org = await ctx.runMutation(components.betterAuth.lib.create, {
      input: {
        model: "organization",
        data: {
          name: args.name,
          slug: args.slug || args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          createdAt: Date.now()
        }
      }
    });

    // Extract organization ID
    const organizationId = typeof org === "object" && org !== null && "_id" in org
      ? (org as any)._id
      : org;

    const organizationIdStr = String(organizationId);

    // NOTE: Care homes are NOT created automatically here.
    // The owner will create care homes during onboarding or through the dashboard sidebar.

    console.log(`[createOrganization] Organization created by SaaS Admin ${user.email}: ${organizationIdStr}`);

    return {
      organizationId: organizationIdStr,
      success: true
    };
  }
});
