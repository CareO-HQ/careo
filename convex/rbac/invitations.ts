/**
 * Invitation System
 * 
 * Handles role-aware user invitations with expiry and token-based acceptance.
 * Integrates with Better Auth invitation system.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { canInviteUser, resolveUser, ROLES } from "../lib/rbac";
import { components, api } from "../_generated/api";
/**
 * Generate a unique invitation token
 * Uses timestamp + random number for uniqueness
 */
function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Invite a user (role-aware)
 * 
 * - SaaS Admin can invite: owners
 * - Owner can invite: managers
 * - Manager can invite: nurses, care_assistants
 * 
 * Creates an invitation record with token and expiry (7 days default).
 */
export const inviteUser = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("nurse"),
      v.literal("care_assistant")
    ),
    organizationId: v.string(),
    careHomeId: v.optional(v.id("careHomes")),
    unitIds: v.optional(v.array(v.id("units")))
  },
  returns: v.object({
    invitationId: v.id("invitations"),
    token: v.string(),
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Check permission
    const canInvite = await canInviteUser(ctx, args.role);
    if (!canInvite) {
      throw new Error(`Unauthorized: You cannot invite users with role "${args.role}"`);
    }

    // Get current user
    const { user, role: userRole, organizationId: userOrgId } = await resolveUser(ctx);

    // Verify organization access (unless SaaS Admin)
    if (userRole !== ROLES.SAAS_ADMIN && userOrgId !== args.organizationId) {
      throw new Error("Unauthorized: Cannot invite to different organization");
    }

    // Validate careHomeId if provided
    if (args.careHomeId) {
      const careHome = await ctx.db.get(args.careHomeId);
      if (!careHome) {
        throw new Error("Care home not found");
      }
      if (careHome.organizationId !== args.organizationId) {
        throw new Error("Care home does not belong to the specified organization");
      }
    }

    // Validate unitIds if provided
    if (args.unitIds && args.unitIds.length > 0) {
      for (const unitId of args.unitIds) {
        const unit = await ctx.db.get(unitId);
        if (!unit) {
          throw new Error(`Unit ${unitId} not found`);
        }
        if (unit.organizationId !== args.organizationId) {
          throw new Error(`Unit ${unitId} does not belong to the specified organization`);
        }
        if (args.careHomeId && unit.careHomeId !== args.careHomeId) {
          throw new Error(`Unit ${unitId} does not belong to the specified care home`);
        }
      }
    }

    // Check if user already exists
    const existingUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "email", value: args.email }]
    });

    if (existingUser) {
      // Check if user is already a member of this organization
      const existingMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: existingUser.id },
          { field: "organizationId", value: args.organizationId }
        ]
      });

      if (existingMember) {
        throw new Error("User is already a member of this organization");
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("User already has a pending invitation to this organization");
    }

    // Get Better Auth userId for current user (createdBy)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Generate token
    const token = generateToken();

    // Set expiry (7 days from now)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    // Create invitation record
    const invitationId = await ctx.db.insert("invitations", {
      email: args.email,
      role: args.role,
      organizationId: args.organizationId,
      careHomeId: args.careHomeId,
      unitIds: args.unitIds,
      token,
      expiresAt,
      status: "pending",
      createdBy: identity.subject,
      createdAt: Date.now()
    });

    // Also create Better Auth invitation for compatibility
    try {
      await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "invitation",
          data: {
            email: args.email,
            role: args.role,
            organizationId: args.organizationId,
            inviterId: identity.subject,
            status: "pending",
            expiresAt
          }
        }
      });
    } catch (error) {
      console.error("Failed to create Better Auth invitation:", error);
      // Continue - our invitation record is the source of truth
    }

    // Get organization name for email
    let organizationName = "Organization";
    try {
      const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: args.organizationId }]
      });
      if (organization?.name) {
        organizationName = organization.name;
      }
    } catch (error) {
      console.error("Failed to get organization name:", error);
    }

    // Send invitation email
    try {
      await ctx.scheduler.runAfter(0, api.customInviteEmail.sendInvitationEmail, {
        invitationId: String(invitationId), // Convert to string for email action
        email: args.email,
        organizationName,
        inviterName: user.name || user.email
      });
    } catch (error) {
      console.error("Failed to schedule invitation email:", error);
      // Don't fail the invitation creation
    }

    console.log(`[inviteUser] Invitation created for ${args.email} with role ${args.role} by ${user.email}`);

    return {
      invitationId,
      token,
      success: true
    };
  }
});

/**
 * Accept an invitation
 * 
 * Validates token and expiry, then creates Better Auth member and assignments.
 * Single-use (status check).
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string()
  },
  returns: v.object({
    success: v.boolean(),
    organizationId: v.string()
  }),
  handler: async (ctx, args) => {
    // Find invitation by token
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check status
    if (invitation.status === "accepted") {
      throw new Error("Invitation has already been accepted");
    }

    if (invitation.status === "revoked") {
      throw new Error("Invitation has been revoked");
    }

    // Check expiry
    if (Date.now() > invitation.expiresAt) {
      throw new Error("Invitation has expired");
    }

    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Not authenticated");
    }

    // Verify email matches
    if (identity.email !== invitation.email) {
      throw new Error("Invitation email does not match your account email");
    }

    // Get Better Auth user ID
    const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "email", value: invitation.email }]
    });

    if (!authUser) {
      throw new Error("User not found in Better Auth");
    }

    // Create Better Auth member
    const existingMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: authUser.id },
        { field: "organizationId", value: invitation.organizationId }
      ]
    });

    if (!existingMember) {
      await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "member",
          data: {
            userId: authUser.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
            createdAt: Date.now()
          }
        }
      });
    }

    // Create careHomeManagers record if careHomeId provided and role is manager
    if (invitation.careHomeId && invitation.role === "manager") {
      const existingAssignment = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", invitation.careHomeId!))
        .filter((q) => q.eq(q.field("userId"), authUser.id))
        .first();

      if (!existingAssignment) {
        await ctx.db.insert("careHomeManagers", {
          careHomeId: invitation.careHomeId,
          userId: authUser.id,
          assignedAt: Date.now(),
          assignedBy: invitation.createdBy
        });
      }
    }

    // Create unitStaff records if unitIds provided
    if (invitation.unitIds && invitation.unitIds.length > 0) {
      for (const unitId of invitation.unitIds) {
        const existingAssignment = await ctx.db
          .query("unitStaff")
          .withIndex("by_unitId", (q) => q.eq("unitId", unitId))
          .filter((q) => q.eq(q.field("userId"), authUser.id))
          .first();

        if (!existingAssignment) {
          const unit = await ctx.db.get(unitId);
          if (unit) {
            await ctx.db.insert("unitStaff", {
              unitId,
              userId: authUser.id,
              role: invitation.role as "nurse" | "care_assistant",
              assignedAt: Date.now(),
              assignedBy: invitation.createdBy
            });

            // Also create teamMembers record
            const existingTeamMember = await ctx.db
              .query("teamMembers")
              .withIndex("byUserAndTeam", (q) =>
                q.eq("userId", authUser.id).eq("teamId", unit.teamId)
              )
              .first();

            if (!existingTeamMember) {
              await ctx.db.insert("teamMembers", {
                userId: authUser.id,
                teamId: unit.teamId,
                organizationId: invitation.organizationId,
                role: invitation.role,
                createdAt: Date.now(),
                createdBy: invitation.createdBy
              });
            }
          }
        }
      }
    }

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted"
    });

    // Set the organization as active in the session
    try {
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (session?.token) {
        await ctx.runMutation(components.betterAuth.lib.updateOne, {
          input: {
            model: "session",
            where: [{ field: "token", value: session.token }],
            update: {
              activeOrganizationId: invitation.organizationId
            }
          }
        });
        console.log(`[acceptInvitation] Set activeOrganizationId to ${invitation.organizationId} for user ${invitation.email}`);
      }
    } catch (error) {
      // Don't fail invitation acceptance if setting active org fails
      console.error(`[acceptInvitation] Failed to set active organization:`, error);
    }

    console.log(`[acceptInvitation] Invitation accepted by ${invitation.email}`);

    return {
      success: true,
      organizationId: invitation.organizationId
    };
  }
});

/**
 * Revoke an invitation
 * 
 * Only the inviter or SaaS Admin can revoke invitations.
 */
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("invitations")
  },
  returns: v.object({
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Get current user
    const { user, role } = await resolveUser(ctx);

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if already accepted or revoked
    if (invitation.status === "accepted") {
      throw new Error("Cannot revoke an accepted invitation");
    }

    if (invitation.status === "revoked") {
      throw new Error("Invitation is already revoked");
    }

    // Check permission: inviter or SaaS Admin
    const identity = await ctx.auth.getUserIdentity();
    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }
    if (role !== ROLES.SAAS_ADMIN && identity?.subject !== invitation.createdBy) {
      throw new Error("Unauthorized: Only the inviter or SaaS Admin can revoke invitations");
    }

    // Revoke invitation
    await ctx.db.patch(args.invitationId, {
      status: "revoked"
    });

    console.log(`[revokeInvitation] Invitation revoked by ${user.email}`);

    return {
      success: true
    };
  }
});

/**
 * Get invitation by token (query)
 */
export const getInvitationByToken = query({
  args: {
    token: v.string()
  },
  returns: v.union(
    v.object({
      email: v.string(),
      role: v.string(),
      organizationId: v.string(),
      expiresAt: v.number(),
      status: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    return {
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      expiresAt: invitation.expiresAt,
      status: invitation.status
    };
  }
});
