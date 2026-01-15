/**
 * RBAC (Role-Based Access Control) Helper Module
 * 
 * Centralized authorization helpers for the multi-tenant care management system.
 * Provides user resolution, role checking, and permission validation.
 * 
 * @module rbac
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { components } from "../_generated/api";

// Role constants
export const ROLES = {
  SAAS_ADMIN: "saas_admin",
  OWNER: "owner",
  MANAGER: "manager",
  NURSE: "nurse",
  CARE_ASSISTANT: "care_assistant"
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Check if user is SaaS Admin
 */
export function isSaasAdmin(user: Doc<"users">): boolean {
  return user.isSaasAdmin === true;
}

/**
 * Get user role from user document and Better Auth member record
 * 
 * Priority:
 * 1. SaaS Admin (from isSaasAdmin flag)
 * 2. Role from Better Auth member record
 * 3. null if no role found
 */
export async function getRoleFromUser(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  member?: any
): Promise<UserRole | null> {
  // Check SaaS Admin first
  if (isSaasAdmin(user)) {
    return ROLES.SAAS_ADMIN;
  }

  // If member record provided, use its role
  if (member?.role && typeof member.role === "string") {
    const role = member.role as string;
    if (Object.values(ROLES).includes(role as UserRole)) {
      return role as UserRole;
    }
  }

  // Try to get member record from Better Auth
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject) {
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (session?.activeOrganizationId) {
        const memberRecord = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "member",
          where: [
            { field: "userId", value: identity.subject },
            { field: "organizationId", value: session.activeOrganizationId }
          ]
        });

        if (memberRecord?.role && typeof memberRecord.role === "string") {
          const role = memberRecord.role as string;
          if (Object.values(ROLES).includes(role as UserRole)) {
            return role as UserRole;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching member record:", error);
  }

  return null;
}

/**
 * Resolve authenticated user with role, organization, and active unit
 * 
 * This is the primary function for getting user context in queries/mutations.
 * Never trust client-provided role claims - always resolve from database.
 */
export async function resolveUser(
  ctx: QueryCtx | MutationCtx
): Promise<{
  user: Doc<"users">;
  role: UserRole | null;
  organizationId: string | null;
  activeUnitId: Id<"units"> | null;
}> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity?.email) {
    throw new Error("Not authenticated");
  }

  // Get user from Convex database
  const user = await ctx.db
    .query("users")
    .withIndex("byEmail", (q) => q.eq("email", identity.email!))
    .first();

  if (!user) {
    throw new Error("User not found in database");
  }

  // Get session for organization context
  let organizationId: string | null = null;
  let member: any = null;

  try {
    const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
    if (session?.activeOrganizationId) {
      // CRITICAL: Validate that the organization exists before using it
      const orgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: session.activeOrganizationId }]
      });

      if (orgExists) {
        organizationId = session.activeOrganizationId;
        console.log(`[resolveUser] Using organizationId ${organizationId} from session for user ${identity.email}`);
        
        // Get member record for role (but don't require it during onboarding)
        if (identity.subject) {
          member = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "member",
            where: [
              { field: "userId", value: identity.subject },
              { field: "organizationId", value: organizationId }
            ]
          });
          // If no member record but organization exists, that's OK during onboarding
          // The organizationId from session is still valid
          if (!member) {
            console.log(`[resolveUser] No member record found for organizationId ${organizationId}, but organization exists. This is OK during onboarding.`);
          }
        }
      } else {
        // Session has invalid organizationId - try to get from member record
        console.warn(`[resolveUser] Session has invalid organizationId ${session.activeOrganizationId} for user ${identity.email}. Trying member record fallback.`);
        if (identity.subject) {
          const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "member",
            where: [{ field: "userId", value: identity.subject }],
            paginationOpts: {
              cursor: null,
              numItems: 1
            }
          });

          if (members?.page && members.page.length > 0) {
            const firstMember = members.page[0];
            // Validate the organization from member record exists
            const memberOrgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "organization",
              where: [{ field: "id", value: firstMember.organizationId }]
            });

            if (memberOrgExists) {
              organizationId = firstMember.organizationId;
              member = firstMember;
              console.log(`[resolveUser] Using organizationId ${organizationId} from member record for user ${identity.email}`);
            }
          }
        }
      }
    } else if (identity.subject) {
      // No activeOrganizationId in session - try to get from member record
      const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "member",
        where: [{ field: "userId", value: identity.subject }],
        paginationOpts: {
          cursor: null,
          numItems: 1
        }
      });

      if (members?.page && members.page.length > 0) {
        const firstMember = members.page[0];
        // Validate the organization from member record exists
        const memberOrgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "organization",
          where: [{ field: "id", value: firstMember.organizationId }]
        });

        if (memberOrgExists) {
          organizationId = firstMember.organizationId;
          member = firstMember;
          console.log(`[resolveUser] Using organizationId ${organizationId} from member record (no session) for user ${identity.email}`);
        } else {
          console.warn(`[resolveUser] Member record found but organization ${firstMember.organizationId} does not exist for user ${identity.email}`);
        }
      }
    }
    
    // If still no organizationId found and no member record, try invitations as fallback (during onboarding)
    if (!organizationId && identity.email) {
      try {
        // Try Convex invitations table
        const userEmail = identity.email; // Store in variable for type narrowing
        const invitations = await ctx.db
          .query("invitations")
          .withIndex("by_email", (q) => q.eq("email", userEmail))
          .filter((q) => q.or(
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "pending")
          ))
          .order("desc")
          .take(1);

        if (invitations.length > 0) {
          const invitation = invitations[0];
          // Validate the organization exists
          const invOrgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "organization",
            where: [{ field: "id", value: invitation.organizationId }]
          });

          if (invOrgExists) {
            organizationId = invitation.organizationId;
            console.log(`[resolveUser] Using organizationId ${organizationId} from invitation for user ${identity.email}`);
          }
        }
      } catch (error) {
        console.error("[resolveUser] Error checking invitations:", error);
      }
    }
  } catch (error) {
    console.error("Error fetching session/member:", error);
  }

  // Get role from user/member
  let role = await getRoleFromUser(ctx, user, member);

  // Fallback: derive role from latest invitation when member is missing
  if (!role && identity.email) {
    const userEmail = identity.email;
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "accepted"), q.eq(q.field("status"), "pending"))
      )
      .order("desc")
      .take(1);

    if (invitations.length > 0) {
      const invitation = invitations[0];
      const invitedRole = invitation.role;
      if (Object.values(ROLES).includes(invitedRole as UserRole)) {
        role = invitedRole as UserRole;
        if (!organizationId) {
          organizationId = invitation.organizationId;
        }
        console.warn(
          `[resolveUser] Using role ${role} from invitation for user ${identity.email}`
        );
      }
    }
  }

  // Fallback: derive role from local tables if still missing
  if (!role && identity.subject) {
    // Owner: created a care home in this organization
    if (organizationId) {
      const ownedCareHome = await ctx.db
        .query("careHomes")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
        .filter((q) => q.eq(q.field("organizationId"), organizationId))
        .first();
      if (ownedCareHome) {
        role = ROLES.OWNER;
        console.warn(
          `[resolveUser] Using role ${role} from careHomes.createdBy for user ${identity.email}`
        );
      }
    }

    // Manager: assigned to manage a care home
    if (!role) {
      const managerAssignment = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .first();
      if (managerAssignment) {
        if (organizationId) {
          const careHome = await ctx.db.get(managerAssignment.careHomeId);
          if (careHome?.organizationId === organizationId) {
            role = ROLES.MANAGER;
          }
        } else {
          role = ROLES.MANAGER;
        }
        if (role) {
          console.warn(
            `[resolveUser] Using role ${role} from careHomeManagers for user ${identity.email}`
          );
        }
      }
    }

    // Nurse/Care Assistant: role stored on teamMembers
    if (!role) {
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("byUserId", (q) => q.eq("userId", identity.subject))
        .first();
      const teamRole = teamMember?.role;
      if (teamRole && Object.values(ROLES).includes(teamRole as UserRole)) {
        role = teamRole as UserRole;
        if (!organizationId && teamMember?.organizationId) {
          organizationId = teamMember.organizationId;
        }
        console.warn(
          `[resolveUser] Using role ${role} from teamMembers for user ${identity.email}`
        );
      }
    }

    if (!role && identity.email && organizationId) {
      const orgId = organizationId;
      const teamMemberByEmail = await ctx.db
        .query("teamMembers")
        .withIndex("byOrganization", (q) => q.eq("organizationId", orgId))
        .filter((q) => q.eq(q.field("email"), identity.email))
        .first();
      const teamRole = teamMemberByEmail?.role;
      if (teamRole && Object.values(ROLES).includes(teamRole as UserRole)) {
        role = teamRole as UserRole;
        console.warn(
          `[resolveUser] Using role ${role} from teamMembers email for user ${identity.email}`
        );
      }
    }

    // Fallback: derive role from unitStaff assignments
    if (!role && identity.subject) {
      const unitStaff = await ctx.db
        .query("unitStaff")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .first();
      const staffRole = unitStaff?.role;
      if (staffRole && Object.values(ROLES).includes(staffRole as UserRole)) {
        role = staffRole as UserRole;
        console.warn(
          `[resolveUser] Using role ${role} from unitStaff for user ${identity.email}`
        );
      }
    }
  }

  // Get active unit ID
  const activeUnitId = user.activeUnitId || null;

  return {
    user,
    role,
    organizationId,
    activeUnitId
  };
}

/**
 * Check if user can create organizations (SaaS Admin only)
 */
export async function canCreateOrganization(ctx: MutationCtx): Promise<boolean> {
  const { user } = await resolveUser(ctx);
  return isSaasAdmin(user);
}

/**
 * Check if user can create care homes (Owner only)
 */
export async function canCreateCareHome(
  ctx: MutationCtx,
  organizationId: string
): Promise<boolean> {
  const { user, role, organizationId: userOrgId } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can create care homes in any organization
  if (role === ROLES.SAAS_ADMIN) {
    return true;
  }

  // Owner can create care homes in their organization
  if (role === ROLES.OWNER && userOrgId === organizationId) {
    return true;
  }

  return false;
}

/**
 * Check if user can create units (Manager only)
 */
export async function canCreateUnit(
  ctx: MutationCtx,
  careHomeId: Id<"careHomes">
): Promise<boolean> {
  const { user, role, organizationId } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can create units
  if (role === ROLES.SAAS_ADMIN) {
    return true;
  }

  // Manager can create units in care homes they manage
  if (role === ROLES.MANAGER && organizationId) {
    // Check if user is manager of this care home
    const careHome = await ctx.db.get(careHomeId);
    if (!careHome) {
      return false;
    }

    // Verify care home belongs to user's organization
    if (careHome.organizationId !== organizationId) {
      return false;
    }

    // Check if user is assigned as manager of this care home
    const managerAssignment = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
      .filter((q) => {
        const identity = ctx.auth.getUserIdentity();
        // We need Better Auth userId, get it from session
        return q.eq(q.field("userId"), ""); // Will be checked in handler
      })
      .first();

    // Get Better Auth userId from identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      return false;
    }

    const managerCheck = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return !!managerCheck;
  }

  return false;
}

/**
 * Check if user can invite other users (role-aware)
 */
export async function canInviteUser(
  ctx: MutationCtx,
  targetRole: UserRole
): Promise<boolean> {
  const { role } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can invite owners
  if (role === ROLES.SAAS_ADMIN && targetRole === ROLES.OWNER) {
    return true;
  }

  // Owner can invite managers
  if (role === ROLES.OWNER && targetRole === ROLES.MANAGER) {
    return true;
  }

  // Manager can invite nurses and care assistants
  if (role === ROLES.MANAGER && (targetRole === ROLES.NURSE || targetRole === ROLES.CARE_ASSISTANT)) {
    return true;
  }

  return false;
}

/**
 * Check if user can access organization data
 */
export async function canAccessOrganization(
  ctx: QueryCtx,
  organizationId: string
): Promise<boolean> {
  const { role, organizationId: userOrgId } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can access all organizations
  if (role === ROLES.SAAS_ADMIN) {
    return true;
  }

  // Non-admin users can only access their own organization
  return userOrgId === organizationId;
}

/**
 * Check if user can access unit data
 */
export async function canAccessUnit(
  ctx: QueryCtx,
  unitId: Id<"units">
): Promise<boolean> {
  const { role, organizationId, activeUnitId } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can access all units
  if (role === ROLES.SAAS_ADMIN) {
    return true;
  }

  // Get unit to check organization and care home
  const unit = await ctx.db.get(unitId);
  if (!unit) {
    return false;
  }

  // Verify organization match
  if (unit.organizationId !== organizationId) {
    return false;
  }

  // Owner can access any unit in their organization
  if (role === ROLES.OWNER) {
    return true;
  }

  // Manager can only access units in care homes they manage
  if (role === ROLES.MANAGER) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      return false;
    }

    const managerAssignment = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return !!managerAssignment;
  }

  // Nurse and Care Assistant can only access their active unit
  if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
    return activeUnitId === unitId;
  }

  return false;
}

/**
 * Scope query by organization (enforce tenant isolation)
 * 
 * For SaaS Admin: no filter
 * For others: filter by organizationId
 */
export function scopeByOrganization<T>(
  query: any,
  organizationId: string | null,
  userRole: UserRole | null
): any {
  // SaaS Admin can see all organizations
  if (userRole === ROLES.SAAS_ADMIN) {
    return query;
  }

  // Others must be scoped to their organization
  if (organizationId) {
    return query.filter((q: any) => q.eq(q.field("organizationId"), organizationId));
  }

  // No organizationId means no access
  throw new Error("Unauthorized: No organization access");
}

/**
 * Scope query by unit (for Nurse/Care Assistant)
 * 
 * Only applies to Nurse and Care Assistant roles.
 * Others can access all units in their organization.
 */
export function scopeByUnit<T>(
  query: any,
  unitId: Id<"units"> | null,
  userRole: UserRole | null
): any {
  // SaaS Admin, Owner, Manager: no unit filter
  if (
    userRole === ROLES.SAAS_ADMIN ||
    userRole === ROLES.OWNER ||
    userRole === ROLES.MANAGER
  ) {
    return query;
  }

  // Nurse and Care Assistant: must filter by active unit
  if (userRole === ROLES.NURSE || userRole === ROLES.CARE_ASSISTANT) {
    if (!unitId) {
      throw new Error("Unauthorized: No active unit");
    }
    return query.filter((q: any) => q.eq(q.field("unitId"), unitId));
  }

  return query;
}

/**
 * Resolve active care home for the current user
 * 
 * Returns the user's active care home, or the first care home in their organization.
 * For SaaS Admin, returns null (can access all).
 * For Managers, verifies they're assigned to the care home.
 */
export async function resolveCareHome(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"careHomes"> | null> {
  const { user, role, organizationId } = await resolveUser(ctx);

  // SaaS Admin can access all care homes - return null to indicate no filtering needed
  if (role === ROLES.SAAS_ADMIN) {
    return null;
  }

  if (!organizationId) {
    return null;
  }

  // If user has activeCareHomeId set, verify access and return it
  if (user.activeCareHomeId) {
    const careHome = await ctx.db.get(user.activeCareHomeId);
    if (careHome && careHome.organizationId === organizationId) {
      // For managers, verify they're assigned to this care home
      if (role === ROLES.MANAGER) {
        const identity = await ctx.auth.getUserIdentity();
        if (identity?.subject) {
          const managerAssignment = await ctx.db
            .query("careHomeManagers")
            .withIndex("by_careHomeId", (q) => q.eq("careHomeId", user.activeCareHomeId!))
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .first();

          if (managerAssignment) {
            return user.activeCareHomeId;
          }
        }
        // Manager not assigned to this care home - fall through to get first assigned care home
      } else {
        // Owner, Nurse, Care Assistant can access care homes in their organization
        return user.activeCareHomeId;
      }
    }
  }

  // Get first care home in organization
  // For managers, get first care home they're assigned to
  if (role === ROLES.MANAGER) {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject) {
      // Get all care homes the manager is assigned to
      const managerAssignments = await ctx.db
        .query("careHomeManagers")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      // Filter to care homes in this organization
      for (const assignment of managerAssignments) {
        const careHome = await ctx.db.get(assignment.careHomeId);
        if (careHome && careHome.organizationId === organizationId) {
          return careHome._id;
        }
      }
    }
    return null;
  }

  // For owners and others, get first care home in organization
  const firstCareHome = await ctx.db
    .query("careHomes")
    .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
    .first();

  return firstCareHome?._id || null;
}

/**
 * Check if user can access a specific care home
 */
export async function canAccessCareHome(
  ctx: QueryCtx | MutationCtx,
  careHomeId: Id<"careHomes">
): Promise<boolean> {
  const { role, organizationId } = await resolveUser(ctx);

  if (!role) {
    return false;
  }

  // SaaS Admin can access all care homes
  if (role === ROLES.SAAS_ADMIN) {
    return true;
  }

  // Get care home
  const careHome = await ctx.db.get(careHomeId);
  if (!careHome) {
    return false;
  }

  // Verify organization match
  if (careHome.organizationId !== organizationId) {
    return false;
  }

  // Owner can access all care homes in their organization
  if (role === ROLES.OWNER) {
    return true;
  }

  // Manager can only access care homes they're assigned to
  if (role === ROLES.MANAGER) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      return false;
    }

    const managerAssignment = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", careHomeId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return !!managerAssignment;
  }

  // Nurse and Care Assistant can access care homes that contain their units
  if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
    const { activeUnitId } = await resolveUser(ctx);
    if (!activeUnitId) {
      return false;
    }

    const unit = await ctx.db.get(activeUnitId);
    return unit?.careHomeId === careHomeId;
  }

  return false;
}
