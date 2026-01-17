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
      _creationTime: v.number(),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number()
    })
  ),
  handler: async (ctx, args) => {
    try {
      const { user, role, organizationId: userOrgId } = await resolveUser(ctx);

      // Determine target organization
      const targetOrgId = args.organizationId || userOrgId;

      if (!targetOrgId) {
        console.warn("[getCareHomes] No organization ID available");
        return [];
      }

      // SaaS Admin can see all care homes
      if (role === ROLES.SAAS_ADMIN) {
        if (args.organizationId) {
          // CRITICAL: Validate organization exists in Better Auth before returning care homes
          const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "organization",
            where: [{ field: "id", value: args.organizationId }]
          });

          if (!organization) {
            // Organization doesn't exist - return empty array instead of error
            // This handles cases where organization was deleted but care homes still exist
            console.warn(`[getCareHomes] Organization ${args.organizationId} not found in Better Auth`);
            return [];
          }

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
          console.warn(`[getCareHomes] Role is null but targetOrgId (${targetOrgId}) doesn't match userOrgId (${userOrgId})`);
          return [];
        }

        // During onboarding, allow users to see care homes they created
        const identity = await ctx.auth.getUserIdentity();
        if (!identity?.subject) {
          return [];
        }

        const careHomes = await ctx.db
          .query("careHomes")
          .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
          .filter((q) => q.eq(q.field("organizationId"), targetOrgId))
          .collect();
        console.log(`[getCareHomes] Found ${careHomes.length} care homes created by user (role null) in org ${targetOrgId}`);
        return careHomes;
      }

      // If role is still null and no organization, return empty
      if (!role) {
        console.warn("[getCareHomes] No role and no organization");
        return [];
      }

      // Owner can see all care homes they created
      if (role === ROLES.OWNER) {
        if (targetOrgId !== userOrgId) {
          console.warn(`[getCareHomes] Target org ${targetOrgId} doesn't match user org ${userOrgId}`);
          return [];
        }

        const identity = await ctx.auth.getUserIdentity();
        if (!identity?.subject) {
          return [];
        }

        const careHomes = await ctx.db
          .query("careHomes")
          .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
          .filter((q) => q.eq(q.field("organizationId"), targetOrgId))
          .collect();
        console.log(`[getCareHomes] Found ${careHomes.length} care homes created by owner in org ${targetOrgId}`);
        return careHomes;
      }

      // Managers, nurses, care assistants should NOT see care homes in the sidebar
      // Only owners can see and switch between care homes
      if (role === ROLES.MANAGER || role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
        console.log(`[getCareHomes] Returning empty array for ${role} - only owners can see care homes`);
        return [];
      }

      // Default: restrict to organization only
      if (targetOrgId !== userOrgId) {
        console.warn(`[getCareHomes] Unauthorized: targetOrgId ${targetOrgId} !== userOrgId ${userOrgId}`);
        return [];
      }

      const careHomes = await ctx.db
        .query("careHomes")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", targetOrgId))
        .collect();
      console.log(`[getCareHomes] Found ${careHomes.length} care homes for role ${role} in org ${targetOrgId}`);
      return careHomes;
    } catch (error) {
      console.error("[getCareHomes] Error:", error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
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

    const identity = await ctx.auth.getUserIdentity();

    // Role-null users (onboarding owners) should default to their created care homes
    if (!role && identity?.subject) {
      const firstCreatedCareHome = await ctx.db
        .query("careHomes")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
        .filter((q) => q.eq(q.field("organizationId"), organizationId))
        .first();

      if (firstCreatedCareHome) {
        return {
          _id: firstCreatedCareHome._id as Id<"careHomes">,
          organizationId: firstCreatedCareHome.organizationId,
          name: firstCreatedCareHome.name,
          createdBy: firstCreatedCareHome.createdBy,
          createdAt: firstCreatedCareHome.createdAt
        };
      }
    }

    // Owners should default to one of their created care homes
    if (role === ROLES.OWNER && identity?.subject) {
      const firstOwnerCareHome = await ctx.db
        .query("careHomes")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
        .filter((q) => q.eq(q.field("organizationId"), organizationId))
        .first();

      if (firstOwnerCareHome) {
        return {
          _id: firstOwnerCareHome._id as Id<"careHomes">,
          organizationId: firstOwnerCareHome.organizationId,
          name: firstOwnerCareHome.name,
          createdBy: firstOwnerCareHome.createdBy,
          createdAt: firstOwnerCareHome.createdAt
        };
      }
    }

    // Managers/nurses/care assistants should default to invited care homes
    if (
      (role === ROLES.MANAGER || role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) &&
      identity?.email
    ) {
      const invitations = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", identity.email!))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "accepted"), q.eq(q.field("status"), "pending"))
        )
        .collect();

      const invitedCareHome = invitations.find((invitation) => invitation.careHomeId);
      if (invitedCareHome?.careHomeId) {
        const careHome = await ctx.db.get(invitedCareHome.careHomeId);
        if (careHome && careHome.organizationId === organizationId) {
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
 * Get carehome details with teams and staff (for SaaS Admin)
 * Returns carehome info, teams count, teams list, and staff list
 */
export const getCareHomeDetails = query({
  args: {
    careHomeId: v.id("careHomes")
  },
  returns: v.union(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      createdBy: v.string(),
      createdAt: v.number(),
      teams: v.array(
        v.object({
          _id: v.string(),
          name: v.string(),
          teamId: v.string(),
          staffCount: v.number()
        })
      ),
      staff: v.array(
        v.object({
          userId: v.string(),
          email: v.string(),
          name: v.string(),
          role: v.string(),
          unitNames: v.array(v.string())
        })
      ),
      teamsCount: v.number(),
      staffCount: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Verify user is SaaS Admin
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity || !userIdentity.email) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", userIdentity.email as string))
      .first();

    if (!user || user.isSaasAdmin !== true) {
      throw new Error("Only SaaS Admin can access this function");
    }

    // Get carehome
    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      return null;
    }

    // Get all units (teams) for this carehome
    const units = await ctx.db
      .query("units")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
      .collect();

    const useOrgFallback = units.length === 0;

    // Get staff for each unit
    const staffByUser = new Map<
      string,
      {
        userId: string;
        email: string;
        name: string;
        roles: Set<string>;
        unitNames: Set<string>;
      }
    >();

    const getUserInfo = async (userId: string, fallbackEmail?: string) => {
      try {
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: userId }]
        });

        const email = authUser?.email || fallbackEmail || "";
        let name = authUser?.name || authUser?.email || fallbackEmail || "";

        if (email) {
          const localUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", email))
            .first();
          if (localUser?.name) {
            name = localUser.name;
          }
        }

        return { email, name };
      } catch (error) {
        return {
          email: fallbackEmail || "",
          name: fallbackEmail || ""
        };
      }
    };

    const upsertStaffMember = (
      userId: string,
      userInfo: { email: string; name: string },
      role: string,
      unitName: string
    ) => {
      const existing = staffByUser.get(userId);
      if (existing) {
        existing.roles.add(role);
        existing.unitNames.add(unitName);
        if (!existing.name && userInfo.name) {
          existing.name = userInfo.name;
        }
        if (!existing.email && userInfo.email) {
          existing.email = userInfo.email;
        }
        return;
      }

      staffByUser.set(userId, {
        userId,
        email: userInfo.email,
        name: userInfo.name,
        roles: new Set([role]),
        unitNames: new Set([unitName])
      });
    };

    let teamsWithStaffCount = await Promise.all(
      units.map(async (unit) => {
        // Get staff assigned to this unit
        const unitStaff = await ctx.db
          .query("unitStaff")
          .withIndex("by_unitId", (q) => q.eq("unitId", unit._id))
          .collect();

        for (const staff of unitStaff) {
          const userInfo = await getUserInfo(staff.userId);
          upsertStaffMember(staff.userId, userInfo, staff.role, unit.name);
        }

        // Include team members for this unit's team
        const teamMembers = await ctx.db
          .query("teamMembers")
          .withIndex("byTeamId", (q) => q.eq("teamId", unit.teamId))
          .collect();

        for (const member of teamMembers) {
          const userInfo = await getUserInfo(member.userId, member.email);
          upsertStaffMember(member.userId, userInfo, member.role || "member", unit.name);
        }

        return {
          _id: String(unit._id),
          name: unit.name,
          teamId: unit.teamId,
          staffCount: unitStaff.length
        };
      })
    );

    if (useOrgFallback) {
      const teamsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "team",
        where: [{ field: "organizationId", value: careHome.organizationId }],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      teamsWithStaffCount = await Promise.all(
        (teamsResult?.page || []).map(async (team: any) => {
          const teamId = team.id || team._id;
          const teamMembers = await ctx.db
            .query("teamMembers")
            .withIndex("byTeamId", (q) => q.eq("teamId", teamId))
            .collect();

          return {
            _id: String(teamId),
            name: team.name || "",
            teamId: String(teamId),
            staffCount: teamMembers.length
          };
        })
      );
    }

    // Include care home managers
    const careHomeManagers = await ctx.db
      .query("careHomeManagers")
      .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId))
      .collect();

    for (const manager of careHomeManagers) {
      const userInfo = await getUserInfo(manager.userId);
      upsertStaffMember(manager.userId, userInfo, "manager", "Care home");
    }

    // Include care home owner (createdBy)
    if (careHome.createdBy) {
      const ownerInfo = await getUserInfo(careHome.createdBy);
      upsertStaffMember(careHome.createdBy, ownerInfo, "owner", "Care home");
    }

    if (useOrgFallback) {
      const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "member",
        where: [{ field: "organizationId", value: careHome.organizationId }],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      for (const member of membersResult?.page || []) {
        const userInfo = await getUserInfo(member.userId);
        upsertStaffMember(member.userId, userInfo, member.role || "member", "Organization");
      }
    }

    const staffList = Array.from(staffByUser.values()).map((member) => ({
      userId: member.userId,
      email: member.email,
      name: member.name,
      role: Array.from(member.roles).join(", "),
      unitNames: Array.from(member.unitNames)
    }));

    return {
      _id: careHome._id,
      organizationId: careHome.organizationId,
      name: careHome.name,
      createdBy: careHome.createdBy,
      createdAt: careHome.createdAt,
      teams: teamsWithStaffCount,
      staff: staffList,
      teamsCount: teamsWithStaffCount.length,
      staffCount: staffList.length
    };
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
    // No-op: previously used for debug logging

    // Get current user
    let { user, role, organizationId: userOrgId } = await resolveUser(ctx);

    // No-op: previously used for debug logging

    // If no organizationId found, try to get it from member record or invitations
    // This handles cases where invitation was just accepted but session hasn't updated yet
    if (!userOrgId) {
      const identity = await ctx.auth.getUserIdentity();
      if (identity?.subject) {
        // Try to get from member record
        const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "userId", value: identity.subject }],
          paginationOpts: {
            cursor: null,
            numItems: 1
          }
        });

        if (members?.page && members.page.length > 0) {
          const member = members.page[0];
          // Validate organization exists
          const orgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "organization",
            where: [{ field: "id", value: member.organizationId }]
          });

          if (orgExists) {
            userOrgId = member.organizationId;
            console.log(`[createCareHome] Found organizationId ${userOrgId} from member record for user ${identity.email}`);

            // Try to set it in session for future requests
            try {
              const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
              if (session?.token && userOrgId) {
                await ctx.runMutation(components.betterAuth.lib.updateOne, {
                  input: {
                    model: "session",
                    where: [{ field: "token", value: session.token }],
                    update: {
                      activeOrganizationId: userOrgId
                    }
                  }
                });
                console.log(`[createCareHome] Set activeOrganizationId to ${userOrgId} in session`);
              }
            } catch (error) {
              // Don't fail if setting session fails
              console.error("[createCareHome] Failed to set activeOrganizationId in session:", error);
            }
          }
        }

        // If still no organizationId, try invitations table
        if (!userOrgId && identity.email) {
          const invitations = await ctx.db
            .query("invitations")
            .withIndex("by_email", (q) => q.eq("email", identity.email!))
            .filter((q) => q.or(
              q.eq(q.field("status"), "accepted"),
              q.eq(q.field("status"), "pending")
            ))
            .order("desc")
            .take(1);

          if (invitations.length > 0) {
            const invitation = invitations[0];
            // Validate organization exists
            const invOrgExists = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "organization",
              where: [{ field: "id", value: invitation.organizationId }]
            });

            if (invOrgExists) {
              userOrgId = invitation.organizationId;
              console.log(`[createCareHome] Found organizationId ${userOrgId} from invitation for user ${identity.email}`);
            }
          }
        }
      }
    }

    // Allow creation even if role is null (during onboarding)
    // But still require organization
    if (!userOrgId) {
      // #region agent log
      // No-op: previously used for debug logging
      // #endregion
      throw new Error("Unauthorized: You must belong to an organization to create care homes. Please ensure you have accepted the invitation and try again.");
    }

    // Check permission - Owner can create care homes (or during onboarding)
    if (role) {
      const canCreate = await canCreateCareHome(ctx, userOrgId);
      // #region agent log
      // No-op: previously used for debug logging
      // #endregion
      if (!canCreate) {
        throw new Error("Unauthorized: Only Owners can create care homes");
      }
    } else {
      // #region agent log
      // No-op: previously used for debug logging
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
      // No-op: previously used for debug logging
      // #endregion
      console.error(`[createCareHome] Organization ${userOrgId} not found in Better Auth for user ${user.email}`);
      throw new Error(`Organization not found. The organization with ID ${userOrgId} does not exist in Better Auth. Please contact your administrator.`);
    }

    // Additional validation: Ensure organization ID format is valid
    if (!userOrgId || typeof userOrgId !== 'string' || userOrgId.trim() === '') {
      // #region agent log
      // No-op: previously used for debug logging
      // #endregion
      throw new Error("Invalid organization ID. Please contact your administrator.");
    }

    // CRITICAL SAFEGUARDS:
    // 1. This function MUST NEVER create a Better Auth organization
    // 2. Care homes are stored ONLY in Convex careHomes table
    // 3. Care homes are linked to users via:
    //    - careHome.createdBy (Better Auth userId)
    //    - user.activeCareHomeId (Convex user record)
    // 4. Care homes belong to organizations (stored in Better Auth), but the care home itself is in Convex

    // Get Better Auth userId for linking the care home to the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("User identity not found");
    }

    // FINAL VERIFICATION: Ensure we're not accidentally creating a Better Auth organization
    // This is a defensive check - we should never reach this point if organization doesn't exist
    // because we validated it above, but this ensures we never create organizations here
    const finalOrgCheck = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: userOrgId }]
    });
    if (!finalOrgCheck) {
      throw new Error(`CRITICAL: Organization ${userOrgId} does not exist. Cannot create care home without valid organization.`);
    }

    // Check for duplicate care home names within the same organization
    // This ensures each care home is distinct and prevents confusion
    const existingCareHomes = await ctx.db
      .query("careHomes")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", userOrgId))
      .collect();

    const duplicateName = existingCareHomes.find(
      (ch) => ch.name.toLowerCase().trim() === args.name.toLowerCase().trim()
    );

    if (duplicateName) {
      throw new Error(
        `A care home with the name "${args.name}" already exists in your organization. Please choose a different name.`
      );
    }

    // CRITICAL: Create care home in Convex careHomes table ONLY
    // This function MUST NEVER create a Better Auth organization.
    // The care home is stored in the Convex database and linked to the user via:
    // 1. createdBy field (Better Auth userId)
    // 2. user.activeCareHomeId field (Convex user record)
    const careHomeId = await ctx.db.insert("careHomes", {
      organizationId: userOrgId,
      name: args.name,
      createdBy: identity.subject, // Link to user via Better Auth userId
      createdAt: Date.now()
    });

    // #region agent log
    // No-op: previously used for debug logging
    // #endregion

    // VERIFICATION: Ensure care home was successfully created in Convex database
    const insertedCareHome = await ctx.db.get(careHomeId);
    if (!insertedCareHome) {
      console.error(`[createCareHome] CRITICAL: Care home ${careHomeId} was not found in Convex database after insertion`);
      throw new Error("Failed to create care home: Record not found in database");
    }

    // CRITICAL VERIFICATION: Ensure organizationId is correctly associated with the care home
    if (!insertedCareHome.organizationId || insertedCareHome.organizationId !== userOrgId) {
      console.error(`[createCareHome] CRITICAL: Care home organizationId mismatch. Expected ${userOrgId}, got ${insertedCareHome.organizationId}`);
      throw new Error(`Failed to create care home: Organization ID verification failed. Expected ${userOrgId}, got ${insertedCareHome.organizationId || 'null'}`);
    }

    // Verify the organization still exists (double-check after insertion)
    const orgVerification = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: insertedCareHome.organizationId }]
    });
    if (!orgVerification) {
      console.error(`[createCareHome] CRITICAL: Organization ${insertedCareHome.organizationId} not found after care home creation`);
      throw new Error(`Failed to create care home: Associated organization ${insertedCareHome.organizationId} does not exist`);
    }

    // Verify the care home is properly linked to the user
    if (insertedCareHome.createdBy !== identity.subject) {
      console.error(`[createCareHome] CRITICAL: Care home createdBy mismatch. Expected ${identity.subject}, got ${insertedCareHome.createdBy}`);
      throw new Error("Failed to create care home: User linkage verification failed");
    }

    console.log(`[createCareHome] Successfully created care home ${careHomeId} with organizationId ${insertedCareHome.organizationId} for user ${identity.email}`);

    // Link care home to user in Convex users table via activeCareHomeId
    // This creates a bidirectional relationship: careHome.createdBy -> user, user.activeCareHomeId -> careHome
    if (!user.activeCareHomeId) {
      await ctx.db.patch(user._id, {
        activeCareHomeId: careHomeId
      });

      // Verify the user record was updated correctly
      const updatedUser = await ctx.db.get(user._id);
      if (!updatedUser || updatedUser.activeCareHomeId !== careHomeId) {
        console.error(`[createCareHome] CRITICAL: Failed to set activeCareHomeId on user ${user._id}`);
        throw new Error("Failed to link care home to user");
      }

      // #region agent log
      // No-op: previously used for debug logging
      // #endregion
    }

    console.log(`[createCareHome] Care home created: ${careHomeId} by ${user.email}`);

    // #region agent log
    // No-op: previously used for debug logging
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

    // Get care home
    const careHome = await ctx.db.get(args.careHomeId);
    if (!careHome) {
      throw new Error("Care home not found");
    }

    // Allow onboarding users without role to set active care home within their organization
    if (!role) {
      if (careHome.organizationId !== organizationId) {
        throw new Error("Unauthorized: Care home does not belong to your organization");
      }

      await ctx.db.patch(user._id, {
        activeCareHomeId: args.careHomeId
      });

      console.log(`[switchActiveCareHome] User ${user.email} switched to care home ${args.careHomeId} (role null)`);

      return {
        success: true
      };
    }

    // Verify organization access (unless SaaS Admin)
    if (role !== ROLES.SAAS_ADMIN && careHome.organizationId !== organizationId) {
      throw new Error("Unauthorized: Care home does not belong to your organization");
    }

    // Only owners and SaaS admins can switch between care homes
    // Managers, nurses, and care assistants are restricted to their assigned care home
    if (role !== ROLES.OWNER && role !== ROLES.SAAS_ADMIN) {
      throw new Error("Unauthorized: Only owners can switch between care homes");
    }

    // Owner can switch to any care home in their organization
    // No additional check needed beyond organization verification above

    // Update user's activeCareHomeId and clear unit/team context
    // This ensures a clean slate when switching care homes so we don't carry over
    // invalid unit/team selections from the previous care home
    await ctx.db.patch(user._id, {
      activeCareHomeId: args.careHomeId,
      activeUnitId: undefined,
      activeTeamId: undefined
    });

    console.log(`[switchActiveCareHome] User ${user.email} switched to care home ${args.careHomeId}`);

    return {
      success: true
    };
  }
});
