/**
 * Unit Management Mutations and Queries
 * 
 * Handles unit creation (Manager only), staff assignment, and unit switching.
 * Provides queries to list units filtered by care home and organization.
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { canCreateUnit, resolveUser, resolveCareHome, ROLES } from "../lib/rbac";
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
    const effectiveRole = role ?? (user.activeUnitId ? ROLES.NURSE : null);

    if (!effectiveRole) {
      throw new Error("Unauthorized: User role not found");
    }

    // Only Nurse and Care Assistant can switch units
    if (effectiveRole !== ROLES.NURSE && effectiveRole !== ROLES.CARE_ASSISTANT) {
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

    // Update user's activeUnitId and activeTeamId in a single operation
    await ctx.db.patch(user._id, {
      activeUnitId: args.unitId,
      activeTeamId: unit.teamId
    });

    console.log(`[switchActiveUnit] User ${user.email} (${role}) switched to unit ${args.unitId} (team: ${unit.teamId})`);

    return {
      success: true
    };
  }
});

/**
 * Get units by care home
 * 
 * Returns all units in a specific care home.
 * Managers can only see units in care homes they manage.
 * Owners can see all units in their organization's care homes.
 */
export const getUnitsByCareHome = query({
  args: {
    careHomeId: v.id("careHomes")
  },
  returns: v.array(
    v.object({
      _id: v.id("units"),
      careHomeId: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      teamId: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const { role, organizationId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // Get care home
    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      throw new Error("Care home not found");
    }

    // SaaS Admin can access all
    if (role === ROLES.SAAS_ADMIN) {
      return await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
        .collect();
    }

    // Verify organization access
    if (careHome.organizationId !== organizationId) {
      throw new Error("Unauthorized: Care home does not belong to your organization");
    }

    // For managers, verify they're assigned to this care home
    if (role === ROLES.MANAGER) {
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

    // Owner and Manager can see all units in the care home
    // Nurse and Care Assistant can see units they're assigned to
    if (role === ROLES.OWNER || role === ROLES.MANAGER) {
      return await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
        .collect();
    }

    // For Nurse and Care Assistant, filter by their assigned units
    if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        return [];
      }

      // Get all units user is assigned to
      const unitStaff = await ctx.db
        .query("unitStaff")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      const assignedUnitIds = new Set(unitStaff.map(us => us.unitId));

      // Get all units in care home and filter to assigned ones
      const allUnits = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
        .collect();

      return allUnits.filter(unit => assignedUnitIds.has(unit._id));
    }

    return [];
  }
});

/**
 * Get assigned teams for current user
 * 
 * Returns teams for the user, filtered by role:
 * - Nurse/Care Assistant: All units in the active care home (or org fallback)
 * - Manager: All teams in care homes they manage
 * - Owner: All teams in their organization
 * - SaaS Admin: All teams (not typically used)
 */
export const getAssignedTeams = query({
  args: {},
  returns: v.array(
    v.object({
      unitId: v.id("units"),
      teamId: v.string(),
      name: v.string(),
      careHomeId: v.id("careHomes"),
      careHomeName: v.string()
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const { user, role, organizationId } = await resolveUser(ctx);
    const effectiveRole = role ?? (user.activeUnitId ? ROLES.NURSE : null);
    if (!effectiveRole) {
      return [];
    }

    if (!identity?.subject) {
      return [];
    }

    // For Nurse/Care Assistant: show all units in active care home (or org fallback)
    if (effectiveRole === ROLES.NURSE || effectiveRole === ROLES.CARE_ASSISTANT) {
      let units: Array<Doc<"units">> = [];
      let activeCareHomeId = await resolveCareHome(ctx);

      // Fallback: derive care home from active unit if care home isn't set yet
      if (!activeCareHomeId && user.activeUnitId) {
        const activeUnit = await ctx.db.get(user.activeUnitId);
        activeCareHomeId = activeUnit?.careHomeId || null;
      }

      // Fallback: derive care home from unitStaff assignments if org/care home missing
      if (!activeCareHomeId && !organizationId) {
        const unitAssignments = await ctx.db
          .query("unitStaff")
          .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
          .collect();
        const assignedUnitIds = unitAssignments.map((assignment) => assignment.unitId);
        const assignedUnits = await Promise.all(
          assignedUnitIds.map((unitId) => ctx.db.get(unitId))
        );
        const careHomeIds = assignedUnits
          .filter((unit): unit is Doc<"units"> => !!unit)
          .map((unit) => unit.careHomeId);
        activeCareHomeId = careHomeIds.length > 0 ? careHomeIds[0] : null;
      }

      if (activeCareHomeId) {
        units = await ctx.db
          .query("units")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", activeCareHomeId))
          .collect();
      } else if (organizationId) {
        units = await ctx.db
          .query("units")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
          .collect();
      }

      const careHomeIds = Array.from(new Set(units.map((unit) => unit.careHomeId)));
      const careHomes = await Promise.all(
        careHomeIds.map(async (careHomeId) => ({
          careHomeId,
          careHome: await ctx.db.get(careHomeId)
        }))
      );
      const careHomeNameMap = new Map(
        careHomes.map(({ careHomeId, careHome }) => [careHomeId, careHome?.name || ""])
      );

      return units.map((unit) => ({
        unitId: unit._id,
        teamId: unit.teamId,
        name: unit.name,
        careHomeId: unit.careHomeId,
        careHomeName: careHomeNameMap.get(unit.careHomeId) || ""
      }));
    }
    
    // For Manager: all teams in care homes they manage
    if (effectiveRole === ROLES.MANAGER) {
      const managerAssignments = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      const careHomeIds = new Set<Id<"careHomes">>();
      for (const assignment of managerAssignments) {
        const careHome = await ctx.db.get(assignment.careHomeId);
        if (careHome && careHome.organizationId === organizationId) {
          careHomeIds.add(careHome._id);
        }
      }

      const allTeams: Array<{
        unitId: Id<"units">;
        teamId: string;
        name: string;
        careHomeId: Id<"careHomes">;
        careHomeName: string;
      }> = [];

      for (const careHomeId of careHomeIds) {
        const units = await ctx.db
          .query("units")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
          .collect();
        
        const careHome = await ctx.db.get(careHomeId);
        for (const unit of units) {
          allTeams.push({
            unitId: unit._id,
            teamId: unit.teamId,
            name: unit.name,
            careHomeId: unit.careHomeId,
            careHomeName: careHome?.name || ""
          });
        }
      }

      return allTeams;
    }
    
    // For Owner: all teams in organization
    if (effectiveRole === ROLES.OWNER) {
      const units = await ctx.db
        .query("units")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId!))
        .collect();

      const teams = await Promise.all(
        units.map(async (unit) => {
          const careHome = await ctx.db.get(unit.careHomeId);
          return {
            unitId: unit._id,
            teamId: unit.teamId,
            name: unit.name,
            careHomeId: unit.careHomeId,
            careHomeName: careHome?.name || ""
          };
        })
      );

      return teams;
    }

    // SaaS Admin: return empty (they don't use team switching)
    return [];
  }
});

/**
 * Get units by organization
 * 
 * Returns all units in an organization, optionally filtered by care home.
 * Managers can only see units in care homes they manage.
 * Owners can see all units in their organization.
 */
export const getUnitsByOrganization = query({
  args: {
    organizationId: v.optional(v.string()),
    careHomeId: v.optional(v.id("careHomes"))
  },
  returns: v.array(
    v.object({
      _id: v.id("units"),
      careHomeId: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      teamId: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const { role, organizationId: userOrgId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    const targetOrgId = args.organizationId || userOrgId;

    if (!targetOrgId) {
      throw new Error("Organization ID required");
    }

    // SaaS Admin can access all
    if (role === ROLES.SAAS_ADMIN) {
      if (args.careHomeId !== undefined) {
        return await ctx.db
          .query("units")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId!))
          .collect();
      }
      return await ctx.db
        .query("units")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
        .collect();
    }

    // Verify organization access
    if (targetOrgId !== userOrgId) {
      throw new Error("Unauthorized: Cannot access different organization");
    }

    // Resolve care home context
    let targetCareHomeId: Id<"careHomes"> | null = null;
    if (args.careHomeId) {
      const careHome = await ctx.db.get(args.careHomeId);
      if (careHome && careHome.organizationId === targetOrgId) {
        targetCareHomeId = args.careHomeId;
      }
    } else {
      targetCareHomeId = await resolveCareHome(ctx);
    }

    // For managers, get units from care homes they manage
    if (role === ROLES.MANAGER) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        return [];
      }

      // Get all care homes the manager is assigned to
      const managerAssignments = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      const careHomeIds = new Set<Id<"careHomes">>();
      for (const assignment of managerAssignments) {
        const careHome = await ctx.db.get(assignment.careHomeId);
        if (careHome && careHome.organizationId === targetOrgId) {
          if (!targetCareHomeId || careHome._id === targetCareHomeId) {
            careHomeIds.add(careHome._id);
          }
        }
      }

      // Get units from these care homes
      const allUnits: any[] = [];
      for (const careHomeId of careHomeIds) {
        const units = await ctx.db
          .query("units")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
          .collect();
        allUnits.push(...units);
      }

      return allUnits;
    }

    // For owners, get all units in organization (optionally filtered by care home)
    if (role === ROLES.OWNER) {
      if (targetCareHomeId) {
        return await ctx.db
          .query("units")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
          .collect();
      }
      return await ctx.db
        .query("units")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
        .collect();
    }

    // For Nurse and Care Assistant, get units they're assigned to
    if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        return [];
      }

      const unitStaff = await ctx.db
        .query("unitStaff")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      const assignedUnitIds = new Set(unitStaff.map(us => us.unitId));

      // Get all units in organization and filter to assigned ones
      const allUnits = await ctx.db
        .query("units")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
        .collect();

      return allUnits.filter(unit => assignedUnitIds.has(unit._id));
    }

    return [];
  }
});
