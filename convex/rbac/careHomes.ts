/**
 * Care Home Management Mutations
 * 
 * Handles care home creation (Owner only) and manager assignment.
 */

import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../_generated/dataModel";
import { canCreateCareHome, resolveUser, ROLES } from "../lib/rbac";
import { components } from "../_generated/api";

/**
 * Get all care homes for the current user's organization
 */
export const getCareHomes = query({
  args: {
    organizationId: v.optional(v.string())
  },
  returns: v.array(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const { user, role, organizationId: userOrgId } = await resolveUser(ctx);

    // Determine target organization
    const targetOrgId = args.organizationId || userOrgId;

    if (!targetOrgId) {
      return [];
    }

    // SaaS Admin can see all care homes
    if (role === ROLES.SAAS_ADMIN) {
      if (args.organizationId) {
        // Filter by specific organization
        return await ctx.db
          .query("careHomes")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId!))
          .collect();
      } else {
        // Return all care homes
        return await ctx.db.query("careHomes").collect();
      }
    }

    // If role is null but user has an organization, they're likely the owner who just created it
    // Allow them to see care homes in their organization (common during onboarding)
    if (!role && userOrgId) {
      // Verify they have access to this organization
      if (targetOrgId !== userOrgId) {
        throw new Error("Unauthorized: Cannot access different organization");
      }
      
      // Return care homes for their organization
      return await ctx.db
        .query("careHomes")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
        .collect();
    }

    // If role is still null and no organization, return empty
    if (!role) {
      return [];
    }

    // Others can only see care homes in their organization
    if (targetOrgId !== userOrgId) {
      throw new Error("Unauthorized: Cannot access different organization");
    }

    return await ctx.db
      .query("careHomes")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
      .collect();
  }
});

/**
 * Get active care home for current user
 * Returns the user's active care home, or the first care home in their organization if none is set
 * Returns null if user is not authenticated (graceful handling for loading states)
 */
export const getActiveCareHome = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Gracefully handle unauthenticated users (common during page load or after onboarding)
    let user, role, organizationId;
    try {
      const resolved = await resolveUser(ctx);
      user = resolved.user;
      role = resolved.role;
      organizationId = resolved.organizationId;
    } catch (error) {
      // If not authenticated, return null instead of throwing
      // This allows the frontend to handle loading states gracefully
      if (error instanceof Error && error.message === "Not authenticated") {
        return null;
      }
      // Re-throw other errors
      throw error;
    }

    if (!organizationId) {
      return null;
    }

    // If user has activeCareHomeId set, return that
    if (user.activeCareHomeId) {
      const careHome = await ctx.db.get(user.activeCareHomeId) as Doc<"careHomes"> | null;
      if (careHome) {
        // Verify access (unless SaaS Admin)
        if (role === ROLES.SAAS_ADMIN || careHome.organizationId === organizationId) {
          // Return only the fields specified in the validator (exclude _creationTime)
          // Explicitly type the return to match the validator
          return {
            _id: careHome._id as Id<"careHomes">,
            organizationId: careHome.organizationId,
            name: careHome.name,
            createdBy: careHome.createdBy,
            createdAt: careHome.createdAt
          };
        }
      }
    }

    // Otherwise, get the first care home in the organization
    // Allow this even if role is null (common during onboarding)
    const firstCareHome = await ctx.db
      .query("careHomes")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
      .first();

    if (firstCareHome) {
      // Return only the fields specified in the validator (exclude _creationTime)
      // Explicitly type the return to match the validator
      return {
        _id: firstCareHome._id as Id<"careHomes">,
        organizationId: firstCareHome.organizationId,
        name: firstCareHome.name,
        createdBy: firstCareHome.createdBy,
        createdAt: firstCareHome.createdAt
      };
    }

    return null;
  }
});

/**
 * Get a single care home by ID
 */
export const getCareHomeById = query({
  args: {
    careHomeId: v.id("careHomes")
  },
  returns: v.union(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { role, organizationId } = await resolveUser(ctx);

    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      return null;
    }

    // SaaS Admin can access all
    if (role === ROLES.SAAS_ADMIN) {
      return careHome;
    }

    // If role is null but user has organization, allow access if care home belongs to their org
    // This handles the onboarding case where role might not be set yet
    if (!role && organizationId) {
      if (careHome.organizationId !== organizationId) {
        throw new Error("Unauthorized: Care home does not belong to your organization");
      }
      return careHome;
    }

    // If no role and no organization, deny access
    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // Others must be in the same organization
    if (careHome.organizationId !== organizationId) {
      throw new Error("Unauthorized: Care home does not belong to your organization");
    }

    return careHome;
  }
});

/**
 * Populate care homes for all organizations that don't have one
 * This is a one-time migration helper that can be called manually
 */
export const populateCareHomesForAllOrganizations = internalMutation({
  args: {},
  returns: v.object({
    careHomesCreated: v.number(),
    organizationsProcessed: v.number()
  }),
  handler: async (ctx) => {
    // Get all organizations from Better Auth
    const organizationsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    const organizations = organizationsResult?.page || [];
    let careHomesCreated = 0;

    // Get system user ID
    const firstUser = await ctx.db.query("users").first();
    const systemUserId = firstUser ? "system" : "migration";

    for (const org of organizations) {
      // Check if care home already exists
      const existingCareHome = await ctx.db
        .query("careHomes")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", org.id))
        .first();

      if (!existingCareHome) {
        // Create care home
        await ctx.db.insert("careHomes", {
          organizationId: org.id,
          name: org.name || `Care Home for ${org.id}`,
          createdBy: systemUserId,
          createdAt: Date.now()
        });
        careHomesCreated++;
        console.log(`[populateCareHomesForAllOrganizations] Created care home for organization ${org.id}`);
      }
    }

    return {
      careHomesCreated,
      organizationsProcessed: organizations.length
    };
  }
});

/**
 * Ensure a care home exists for an organization
 * This is called automatically when an organization is created
 * Internal mutation - can be called from other mutations or actions
 */
export const ensureCareHomeForOrganization = internalMutation({
  args: {
    organizationId: v.string(),
    organizationName: v.string(),
    createdBy: v.string()
  },
  returns: v.union(v.id("careHomes"), v.null()),
  handler: async (ctx, args) => {
    // CRITICAL: Validate that the organization exists in Better Auth before creating care home
    // This prevents creating orphaned care homes with invalid organizationIds
    const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: args.organizationId }]
    });

    if (!organization) {
      console.error(`[ensureCareHomeForOrganization] Organization ${args.organizationId} not found in Better Auth. Cannot create care home.`);
      throw new Error(`Cannot create care home: Organization ${args.organizationId} does not exist in Better Auth`);
    }

    // Check if care home already exists for this organization
    const existingCareHome = await ctx.db
      .query("careHomes")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .first();

    if (existingCareHome) {
      return existingCareHome._id;
    }

    // Create care home with organization name
    const careHomeId = await ctx.db.insert("careHomes", {
      organizationId: args.organizationId,
      name: args.organizationName,
      createdBy: args.createdBy,
      createdAt: Date.now()
    });

    console.log(`[ensureCareHomeForOrganization] Created care home ${careHomeId} for organization ${args.organizationId}`);

    // Set this as active care home for organization owner if they exist
    try {
      const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "member",
        where: [
          { field: "organizationId", value: args.organizationId },
          { field: "role", value: "owner" }
        ],
        paginationOpts: {
          cursor: null,
          numItems: 10
        }
      });

      if (members?.page && members.page.length > 0) {
        for (const member of members.page) {
          const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "user",
            where: [{ field: "id", value: member.userId }]
          });

          if (authUser?.email) {
            const user = await ctx.db
              .query("users")
              .withIndex("byEmail", (q) => q.eq("email", authUser.email))
              .first();

            if (user && !user.activeCareHomeId) {
              await ctx.db.patch(user._id, {
                activeCareHomeId: careHomeId
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`[ensureCareHomeForOrganization] Failed to set active care home:`, error);
      // Don't fail care home creation if setting active fails
    }

    return careHomeId;
  }
});

/**
 * Create a new care home (Owner only)
 * 
 * IMPORTANT: This function ONLY creates records in the Convex careHomes table.
 * It NEVER creates Better Auth organizations. Organizations are created separately
 * by SaaS Admins or during owner onboarding.
 * 
 * Owners can create care homes within their existing organization.
 * Each care home belongs to exactly one organization.
 * 
 * This creates a care home in the careHomes table, NOT a new Better Auth organization.
 */
export const createCareHome = mutation({
  args: {
    name: v.string()
  },
  returns: v.object({
    careHomeId: v.id("careHomes"),
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    // CRITICAL: This function must NEVER create a Better Auth organization.
    // It only creates records in the Convex careHomes table.
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:entry',message:'createCareHome called',data:{name:args.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    
    // Get current user
    const { user, role, organizationId: userOrgId } = await resolveUser(ctx);
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:afterResolve',message:'after resolveUser',data:{hasUser:!!user,hasRole:!!role,hasOrgId:!!userOrgId,orgId:userOrgId||null,role:role||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    // Allow creation even if role is null (during onboarding)
    // But still require organization
    if (!userOrgId) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:noOrgId',message:'no organizationId error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      throw new Error("Unauthorized: You must belong to an organization to create care homes");
    }

    // Check if a care home already exists for this organization
    const existingCareHome = await ctx.db
      .query("careHomes")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", userOrgId))
      .first();
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:existingCheck',message:'existing care home check',data:{hasExisting:!!existingCareHome},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    if (existingCareHome) {
      // Return existing care home instead of creating a duplicate
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:returnExisting',message:'returning existing care home',data:{careHomeId:existingCareHome._id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      return {
        careHomeId: existingCareHome._id,
        success: true
      };
    }

    // Check permission - Owner can create care homes (or during onboarding)
    if (role) {
      const canCreate = await canCreateCareHome(ctx, userOrgId);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:permissionCheck',message:'permission check result',data:{canCreate,role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      if (!canCreate) {
        throw new Error("Unauthorized: Only Owners can create care homes");
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:noRole',message:'no role but allowing during onboarding',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
    }

    // CRITICAL: Verify organization exists in Better Auth (must exist before creating care home)
    // This prevents creating orphaned care homes with invalid organizationIds
    const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: userOrgId }]
    });

    if (!organization) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:orgNotFound',message:'organization not found in Better Auth',data:{organizationId:userOrgId,userEmail:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      console.error(`[createCareHome] Organization ${userOrgId} not found in Better Auth for user ${user.email}`);
      throw new Error(`Organization not found. The organization with ID ${userOrgId} does not exist in Better Auth. Please contact your administrator.`);
    }

    // Additional validation: Ensure organization ID format is valid
    if (!userOrgId || typeof userOrgId !== 'string' || userOrgId.trim() === '') {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:invalidOrgId',message:'invalid organizationId format',data:{organizationId:userOrgId,userEmail:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      throw new Error("Invalid organization ID. Please contact your administrator.");
    }

    // CRITICAL SAFEGUARD: Verify we are NOT creating a Better Auth organization.
    // This function must ONLY create Convex careHomes records.
    // If organization doesn't exist, we throw an error above - we never create one here.

    // Get Better Auth userId
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Create care home in careHomes table ONLY (NOT a Better Auth organization)
    // This is the ONLY database write operation in this function.
    const careHomeId = await ctx.db.insert("careHomes", {
      organizationId: userOrgId,
      name: args.name,
      createdBy: identity.subject,
      createdAt: Date.now()
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:inserted',message:'care home inserted',data:{careHomeId:String(careHomeId),organizationId:userOrgId,name:args.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    // If user doesn't have an active care home, set this one as active
    if (!user.activeCareHomeId) {
      await ctx.db.patch(user._id, {
        activeCareHomeId: careHomeId
      });
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:setActive',message:'set as active care home',data:{careHomeId:String(careHomeId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
    }

    console.log(`[createCareHome] Care home created: ${careHomeId} by ${user.email}`);
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/8fa2ddb5-baaf-48f0-8938-c784bdded999',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'careHomes.ts:createCareHome:success',message:'care home creation success',data:{careHomeId:String(careHomeId),success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    return {
      careHomeId,
      success: true
    };
  }
});

/**
 * Assign a manager to a care home (Owner only)
 * 
 * Owners can assign managers to care homes in their organization.
 * This creates a careHomeManagers record and a Better Auth member with "manager" role.
 */
export const assignManager = mutation({
  args: {
    careHomeId: v.id("careHomes"),
    userId: v.string() // Better Auth userId
  },
  returns: v.object({
    success: v.boolean(),
    memberId: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    // Get current user
    const { user, role, organizationId } = await resolveUser(ctx);

    if (!role) {
      throw new Error("Unauthorized: User role not found");
    }

    // Only Owner can assign managers (or SaaS Admin)
    if (role !== ROLES.OWNER && role !== ROLES.SAAS_ADMIN) {
      throw new Error("Unauthorized: Only Owners can assign managers");
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

    // Check if user is already a manager of this care home
    const existingAssignment = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingAssignment) {
      throw new Error("User is already assigned as manager of this care home");
    }

    // Get Better Auth userId for current user (assignedBy)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // Create careHomeManagers record
    await ctx.db.insert("careHomeManagers", {
      careHomeId: args.careHomeId,
      userId: args.userId,
      assignedAt: Date.now(),
      assignedBy: identity.subject
    });

    // Create or update Better Auth member with "manager" role
    // First check if member exists
    const existingMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "member",
      where: [
        { field: "userId", value: args.userId },
        { field: "organizationId", value: careHome.organizationId }
      ]
    });

    let memberId: string | undefined;

    if (existingMember) {
      // Update existing member to manager role
      await ctx.runMutation(components.betterAuth.lib.updateOne, {
        input: {
          model: "member",
          where: [{ field: "id", value: existingMember.id }],
          update: { role: "manager" }
        }
      });
      memberId = existingMember.id;
    } else {
      // Create new member with manager role
      const member = await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "member",
          data: {
            userId: args.userId,
            organizationId: careHome.organizationId,
            role: "manager",
            createdAt: Date.now()
          }
        }
      });

      memberId = typeof member === "object" && member !== null && "_id" in member
        ? (member as any)._id
        : member;
      memberId = String(memberId);
    }

    console.log(`[assignManager] Manager assigned to care home ${args.careHomeId} by ${user.email}`);

    return {
      success: true,
      memberId
    };
  }
});

/**
 * Switch active care home
 * 
 * Allows users to switch their active care home context.
 * Updates the user's activeCareHomeId.
 */
export const switchActiveCareHome = mutation({
  args: {
    careHomeId: v.id("careHomes")
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

    // Get care home
    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      throw new Error("Care home not found");
    }

    // Verify organization access (unless SaaS Admin)
    if (role !== ROLES.SAAS_ADMIN && careHome.organizationId !== organizationId) {
      throw new Error("Unauthorized: Care home does not belong to your organization");
    }

    // Verify access based on role
    if (role === ROLES.OWNER) {
      // Owner can switch to any care home in their organization
      // No additional check needed
    } else if (role === ROLES.MANAGER) {
      // Manager can only switch to care homes they manage
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
    } else {
      // Nurse and Care Assistant can switch to care homes that contain their units
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        throw new Error("User identity not found");
      }

      // Check if user has any units in this care home
      const userUnits = await ctx.db
        .query("unitStaff")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .collect();

      // Check synchronously
      let hasAccess = false;
      for (const unitStaff of userUnits) {
        const unit = await ctx.db.get(unitStaff.unitId);
        if (unit?.careHomeId === args.careHomeId) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        throw new Error("Unauthorized: You are not assigned to any units in this care home");
      }
    }

    // Update user's activeCareHomeId
    await ctx.db.patch(user._id, {
      activeCareHomeId: args.careHomeId
    });

    console.log(`[switchActiveCareHome] User ${user.email} switched to care home ${args.careHomeId}`);

    return {
      success: true
    };
  }
});
