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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:101',message:'resolveUser entry',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  const identity = await ctx.auth.getUserIdentity();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:104',message:'identity check',data:{hasIdentity:!!identity,hasEmail:!!identity?.email,hasSubject:!!identity?.subject,email:identity?.email||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion

  if (!identity?.email) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:107',message:'Not authenticated error thrown',data:{identity:identity?JSON.stringify(identity):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:123',message:'session retrieved',data:{hasSession:!!session,hasActiveOrgId:!!session?.activeOrganizationId,activeOrgId:session?.activeOrganizationId||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
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
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:135',message:'member record',data:{hasMember:!!member,memberRole:member?.role||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
          
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rbac.ts:138',message:'session/member error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    console.error("Error fetching session/member:", error);
  }

  // Get role
  const role = await getRoleFromUser(ctx, user, member);

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

  // Get unit to check organization
  const unit = await ctx.db.get(unitId);
  if (!unit) {
    return false;
  }

  // Verify organization match
  if (unit.organizationId !== organizationId) {
    return false;
  }

  // Owner and Manager can access any unit in their organization
  if (role === ROLES.OWNER || role === ROLES.MANAGER) {
    return true;
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
