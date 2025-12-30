import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { components, api } from "./_generated/api";
import { canInviteMembers, getAllowedRolesToInvite, type UserRole } from "./lib/permissions";

/**
 * Create an invitation directly, bypassing better-auth's permission check
 * This allows managers to invite members
 */
export const createInvitationForManager = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("nurse"), v.literal("care_assistant")),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      invitationId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      // Get current session
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { success: false as const, error: "Not authenticated" };
      }

      // Get the current user's member record
      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        return { success: false as const, error: "Member record not found" };
      }

      const userRole = currentMember.role as UserRole;
      
      // Check permissions
      if (!canInviteMembers(userRole)) {
        return { success: false as const, error: "You don't have permission to invite members" };
      }

      // Check if they can invite this specific role
      const allowedRoles = getAllowedRolesToInvite(userRole);
      if (!allowedRoles.includes(args.role as UserRole)) {
        return {
          success: false as const,
          error: `You can only invite: ${allowedRoles.join(", ")}`
        };
      }

      // Check if user already invited
      const existingInvitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [
          { field: "email", value: args.email },
          { field: "organizationId", value: currentMember.organizationId }
        ]
      });

      if (existingInvitation) {
        return {
          success: false as const,
          error: "User is already invited to this organization"
        };
      }

      // Get the organization details
      const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: currentMember.organizationId }]
      });

      if (!organization) {
        return { success: false as const, error: "Organization not found" };
      }

      // Create the invitation directly
      const invitationResult = await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "invitation",
          data: {
            email: args.email,
            role: args.role,
            organizationId: currentMember.organizationId,
            inviterId: session.userId,
            status: "pending",
            expiresAt: Date.now() + (1000 * 60 * 60 * 24 * 7), // 7 days
          }
        }
      });

      // Extract the ID from the result
      const invitationId = typeof invitationResult === 'object' && invitationResult !== null && '_id' in invitationResult
        ? (invitationResult as any)._id
        : invitationResult;

      // Schedule the email sending action
      await ctx.scheduler.runAfter(0, api.customInviteEmail.sendInvitationEmail as any, {
        invitationId: String(invitationId),
        email: args.email,
        organizationName: organization.name,
        inviterName: session.user?.name || "A team member",
      });

      return {
        success: true as const,
        invitationId: String(invitationId),
      };
    } catch (error) {
      console.error("Error creating invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to create invitation"
      };
    }
  },
});

/**
 * Revoke an invitation (manager/owner)
 */
export const revokeInvitationForManager = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { success: false as const, error: "Not authenticated" };
      }

      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        return { success: false as const, error: "Member record not found" };
      }

      const userRole = currentMember.role as UserRole;

      if (!canInviteMembers(userRole)) {
        return { success: false as const, error: "You don't have permission to revoke invitations" };
      }

      const invitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [{ field: "id", value: args.invitationId }]
      });

      if (!invitation) {
        return { success: false as const, error: "Invitation not found" };
      }

      if (invitation.organizationId !== currentMember.organizationId) {
        return { success: false as const, error: "Invitation does not belong to your organization" };
      }

      await ctx.runMutation(components.betterAuth.lib.deleteOne, {
        model: "invitation",
        where: [{ field: "id", value: args.invitationId }]
      });

      return { success: true as const };
    } catch (error) {
      console.error("Error revoking invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to revoke invitation"
      };
    }
  },
});


/**
 * Validate that the current user can invite the specified role
 */
export const validateInvitePermission = mutation({
  args: {
    targetRole: v.union(v.literal("manager"), v.literal("nurse"), v.literal("care_assistant")),
  },
  returns: v.union(
    v.object({
      canInvite: v.literal(true),
    }),
    v.object({
      canInvite: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      // Get current session
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { canInvite: false as const, error: "Not authenticated" };
      }

      // Get the current user's member record
      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        return { canInvite: false as const, error: "Member record not found" };
      }

      const userRole = currentMember.role as UserRole;
      
      // Check if user can invite
      if (!canInviteMembers(userRole)) {
        return { canInvite: false as const, error: "You don't have permission to invite members" };
      }

      // Check if they can invite this specific role
      const allowedRoles = getAllowedRolesToInvite(userRole);
      if (!allowedRoles.includes(args.targetRole as UserRole)) {
        return {
          canInvite: false as const,
          error: `You can only invite: ${allowedRoles.join(", ")}`
        };
      }

      return { canInvite: true as const };
    } catch (error) {
      console.error("Error validating invite permission:", error);
      return {
        canInvite: false as const,
        error: error instanceof Error ? error.message : "Failed to validate permissions"
      };
    }
  },
});

