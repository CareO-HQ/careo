/**
 * Unit Management Mutations
 * 
 * Handles unit creation (Manager only), staff assignment, and unit switching.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { canCreateUnit, resolveUser, ROLES } from "../lib/rbac";
import { components } from "../_generated/api";

/**
 * Create a new unit (Manager only)
 * 
 * Managers can create units within care homes they manage.
 * Creates a Better Auth team and links it to a units record.
 */
export const createUnit = mutation({
  args: {
    careHomeId: v.id("careHomes"),
    name: v.string()
  },
  returns: v.object({
    unitId: v.id("units"),
    teamId: v.string(),
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Check permission
    const canCreate = await canCreateUnit(ctx, args.careHomeId);
    if (!canCreate) {
      throw new Error("Unauthorized: Only Managers can create units");
    }

    // Get current user
    const { user, role, organizationId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // Get care home
    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      throw new Error("Care home not found");
    }

    // Verify organization access (unless SaaS Admin)
    if (role !== ROLES.SAAS_ADMIN && careHome.organizationId !== organizationId) {
      throw new Error("Unauthorized: Care home does not belong to your organization");
    }

    // Verify user is manager of this care home (unless SaaS Admin)
    if (role !== ROLES.SAAS_ADMIN) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        throw new Error("User identity not found");
      }

      const managerAssignment = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .first();

      if (!managerAssignment) {
        throw new Error("Unauthorized: You are not a manager of this care home");
      }
    }

    // Get Better Auth userId for createdBy
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Create Better Auth team
    const team = await ctx.runMutation(components.betterAuth.lib.create, {
      input: {
        model: "team",
        data: {
          name: args.name,
          organizationId: careHome.organizationId,
          createdAt: Date.now()
        }
      }
    });

    // Extract team ID
    const teamId = typeof team === "object" && team !== null && "_id" in team
      ? (team as any)._id
      : team;
    const teamIdStr = String(teamId);

    // Create units record
    const unitId = await ctx.db.insert("units", {
      careHomeId: args.careHomeId,
      organizationId: careHome.organizationId, // Denormalized for queries
      name: args.name,
      teamId: teamIdStr,
      createdBy: identity.subject,
      createdAt: Date.now()
    });

    console.log(`[createUnit] Unit created: ${unitId} (team: ${teamIdStr}) by ${user.email}`);

    return {
      unitId,
      teamId: teamIdStr,
      success: true
    };
  }
});

/**
 * Assign staff to a unit (Manager only)
 * 
 * Managers can assign nurses and care assistants to units in care homes they manage.
 * Creates unitStaff record and teamMembers record.
 */
export const assignStaffToUnit = mutation({
  args: {
    unitId: v.id("units"),
    userId: v.string(), // Better Auth userId
    role: v.union(v.literal("nurse"), v.literal("care_assistant"))
  },
  returns: v.object({
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Get current user
    const { user, role: userRole, organizationId } = await resolveUser(ctx);

    if (!userRole) {
      throw new Error("Unauthorized: User role not found");
    }

    // Only Manager can assign staff (or SaaS Admin)
    if (userRole !== ROLES.MANAGER && userRole !== ROLES.SAAS_ADMIN) {
      throw new Error("Unauthorized: Only Managers can assign staff to units");
    }

    // Get unit
    const unit = await ctx.db.get(args.unitId);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify organization access (unless SaaS Admin)
    if (userRole !== ROLES.SAAS_ADMIN && unit.organizationId !== organizationId) {
      throw new Error("Unauthorized: Unit does not belong to your organization");
    }

    // Verify user is manager of the care home (unless SaaS Admin)
    if (userRole !== ROLES.SAAS_ADMIN) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        throw new Error("User identity not found");
      }

      const managerAssignment = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
        .filter((q) => q.eq(q.field("userId"), identity.subject))
        .first();

      if (!managerAssignment) {
        throw new Error("Unauthorized: You are not a manager of this care home");
      }
    }

    // Check if user is already assigned to this unit
    const existingAssignment = await ctx.db
      .query("unitStaff")
      .withIndex("by_unitId", (q) => q.eq("unitId", args.unitId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingAssignment) {
      throw new Error("User is already assigned to this unit");
    }

    // Get Better Auth userId for current user (assignedBy)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Create unitStaff record
    await ctx.db.insert("unitStaff", {
      unitId: args.unitId,
      userId: args.userId,
      role: args.role,
      assignedAt: Date.now(),
      assignedBy: identity.subject
    });

    // Create or update teamMembers record
    const existingTeamMember = await ctx.db
      .query("teamMembers")
      .withIndex("byUserAndTeam", (q) =>
        q.eq("userId", args.userId).eq("teamId", unit.teamId)
      )
      .first();

    if (!existingTeamMember) {
      await ctx.db.insert("teamMembers", {
        userId: args.userId,
        teamId: unit.teamId,
        organizationId: unit.organizationId,
        role: args.role,
        createdAt: Date.now(),
        createdBy: identity.subject
      });
    } else {
      // Update existing teamMember with role
      await ctx.db.patch(existingTeamMember._id, {
        role: args.role
      });
    }

    // Ensure user has Better Auth member record with correct role
    const existingMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: args.userId },
        { field: "organizationId", value: unit.organizationId }
      ]
    });

    if (!existingMember) {
      // Create member record
      await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "member",
          data: {
            userId: args.userId,
            organizationId: unit.organizationId,
            role: args.role,
            createdAt: Date.now()
          }
        }
      });
    } else if (existingMember.role !== args.role) {
      // Update role if different
      await ctx.runMutation(components.betterAuth.lib.updateOne, {
        input: {
          model: "member",
          where: [{ field: "id", value: existingMember.id }],
          update: { role: args.role }
        }
      });
    }

    console.log(`[assignStaffToUnit] Staff assigned to unit ${args.unitId} by ${user.email}`);

    return {
      success: true
    };
  }
});

/**
 * Switch active unit (Nurse/Care Assistant only)
 * 
 * Allows staff members to switch their active unit context.
 * Only works if user is assigned to the target unit.
 * Does NOT change assignments, only updates activeUnitId.
 */
export const switchActiveUnit = mutation({
  args: {
    unitId: v.id("units")
  },
  returns: v.object({
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // Get current user
    const { user, role, organizationId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // Only Nurse and Care Assistant can switch units
    if (role !== ROLES.NURSE && role !== ROLES.CARE_ASSISTANT) {
      throw new Error("Unauthorized: Only Nurses and Care Assistants can switch units");
    }

    // Get unit
    const unit = await ctx.db.get(args.unitId);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify organization access
    if (unit.organizationId !== organizationId) {
      throw new Error("Unauthorized: Unit does not belong to your organization");
    }

    // Get Better Auth userId
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Verify user is assigned to this unit
    const assignment = await ctx.db
      .query("unitStaff")
      .withIndex("by_unitId", (q) => q.eq("unitId", args.unitId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!assignment) {
      throw new Error("Unauthorized: You are not assigned to this unit");
    }

    // Update user's activeUnitId
    await ctx.db.patch(user._id, {
      activeUnitId: args.unitId
    });

    // Also update activeTeamId for backward compatibility
    await ctx.db.patch(user._id, {
      activeTeamId: unit.teamId
    });

    console.log(`[switchActiveUnit] User ${user.email} switched to unit ${args.unitId}`);

    return {
      success: true
    };
  }
});
