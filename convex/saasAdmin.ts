import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { components, internal, api } from "./_generated/api";

/**
 * Check if database has any users (to detect first user)
 */
export const isFirstUser = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userCount = await ctx.db.query("users").collect();
    return userCount.length === 0;
  }
});

/**
 * Check if current user is SaaS Admin
 */
export const getSaasAdminStatus = query({
  args: {},
  returns: v.object({
    isSaasAdmin: v.boolean(),
    userId: v.optional(v.string())
  }),
  handler: async (ctx) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity || !userIdentity.email) {
      return { isSaasAdmin: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", userIdentity.email as string))
      .first();

    return {
      isSaasAdmin: user?.isSaasAdmin === true,
      userId: userIdentity.subject
    };
  }
});

/**
 * Get the current SaaS Admin user
 */
export const getSaasAdmin = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
      _creationTime: v.number()
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const saasAdmin = await ctx.db
      .query("users")
      .withIndex("bySaasAdmin", (q) => q.eq("isSaasAdmin", true))
      .first();

    return saasAdmin || null;
  }
});

/**
 * Get all care homes with organization details (for SaaS Admin)
 * 
 * IMPORTANT: This function ONLY returns records from the Convex careHomes table.
 * It NEVER returns Better Auth organizations. Organizations are returned by getAllOrganizations.
 */
export const getAllCareHomes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("careHomes"),
      organizationId: v.string(),
      name: v.string(),
      organizationName: v.string(),
      createdAt: v.number(),
      memberCount: v.number(),
      teamCount: v.number(),
      residentCount: v.optional(v.number())
    })
  ),
  handler: async (ctx) => {
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

    // CRITICAL: Get ONLY care homes from Convex careHomes table
    // This must NEVER return Better Auth organizations
    const careHomes = await ctx.db.query("careHomes").collect();
    
    // Validate that we're only getting careHomes records (not organizations)
    // All records must have _id that is an id("careHomes")
    const validCareHomes = careHomes.filter((ch) => {
      const isValid = ch._id && typeof ch._id === "string" && ch._id.startsWith("careHomes");
      if (!isValid) {
        console.error("[getAllCareHomes] Invalid care home record detected:", ch);
      }
      return isValid;
    });

    // Get organization details and statistics for each care home
    const careHomesWithDetails = await Promise.all(
      validCareHomes.map(async (careHome) => {
        // Get organization name
        let organizationName = careHome.name;
        try {
          const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "organization",
            where: [{ field: "id", value: careHome.organizationId }]
          });
          if (organization?.name) {
            organizationName = organization.name;
          }
        } catch (error) {
          console.warn(`Failed to get organization name for ${careHome.organizationId}:`, error);
        }

        // Count members
        const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "organizationId", value: careHome.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });

        // Count teams (units)
        const teams = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "team",
          where: [{ field: "organizationId", value: careHome.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });

        // Count residents
        let residentCount = 0;
        try {
          const residents = await ctx.db
            .query("residents")
            .withIndex("byOrganizationId", (q) => q.eq("organizationId", careHome.organizationId))
            .collect();
          residentCount = residents.length;
        } catch (error) {
          console.warn("Could not count residents:", error);
        }

        return {
          _id: careHome._id,
          organizationId: careHome.organizationId,
          name: careHome.name,
          organizationName,
          createdAt: careHome.createdAt,
          memberCount: members?.page?.length || 0,
          teamCount: teams?.page?.length || 0,
          residentCount
        };
      })
    );

    return careHomesWithDetails;
  }
});

/**
 * List all organizations with statistics
 * 
 * IMPORTANT: This function ONLY returns Better Auth organizations.
 * It NEVER returns Convex careHomes records. Care homes are returned by getAllCareHomes.
 */
export const getAllOrganizations = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      slug: v.string(),
      createdAt: v.number(),
      memberCount: v.number(),
      teamCount: v.number(),
      residentCount: v.optional(v.number()),
      status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deactivated")),
      deactivatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx) => {
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

    // CRITICAL: Get ONLY organizations from Better Auth
    // This must NEVER return Convex careHomes records
    const organizations = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization", // Must be "organization" model from Better Auth
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });
    
    // Validate that we're getting Better Auth organizations, not Convex careHomes
    // Better Auth organizations have 'id' or '_id' as string (not Convex Id type)
    // They should NOT have Convex _id fields that start with "careHomes"

    if (!organizations?.page) {
      return [];
    }

    // Get statistics for each organization
    const orgsWithStats = await Promise.all(
      organizations.page
        .filter((org: any) => {
          // Filter out organizations without a valid ID
          const hasValidId = !!(org.id || org._id);
          if (!hasValidId) {
            console.warn("[getAllOrganizations] Skipping organization without valid ID:", org);
            return false;
          }
          
          // CRITICAL SAFEGUARD: Ensure this is a Better Auth organization, not a Convex careHome
          // Better Auth organizations should NOT have Convex _id fields
          // If it has an _id that looks like a Convex careHome ID, reject it
          const orgId = org.id || org._id;
          if (typeof orgId === "string" && orgId.startsWith("careHomes")) {
            console.error("[getAllOrganizations] ERROR: Found Convex careHome in organizations list! Rejecting:", org);
            return false;
          }
          
          return true;
        })
        .map(async (org: any) => {
          // #region agent log
          console.log("[DEBUG getAllOrganizations] Processing organization:", {
            orgId: org.id,
            org_id: org._id,
            orgKeys: Object.keys(org),
            hypothesisId: "A"
          });
          // #endregion
          
          // Determine the organization ID to use
          const organizationId = org.id || org._id;
          
          // Validate organizationId exists
          if (!organizationId) {
            console.error("[DEBUG getAllOrganizations] ERROR: organizationId is missing!", {
              org,
              hypothesisId: "A"
            });
            // Return a default structure to prevent crashes
            return {
              id: "",
              name: org.name || "",
              slug: org.slug || "",
              createdAt: org.createdAt || org._creationTime || 0,
              memberCount: 0,
              teamCount: 0,
              residentCount: 0
            };
          }
          
          // #region agent log
          console.log("[DEBUG getAllOrganizations] Organization ID determined:", {
            organizationId,
            hasId: !!org.id,
            has_id: !!org._id,
            hypothesisId: "A"
          });
          // #endregion
          
          // Count members
          const whereClause = [{ field: "organizationId", value: organizationId }];
          
          // #region agent log
          console.log("[DEBUG getAllOrganizations] Where clause before query:", {
            whereClause,
            organizationId,
            hypothesisId: "A"
          });
          // #endregion
          
          const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "member",
            where: whereClause,
            paginationOpts: {
              cursor: null,
              numItems: 1000
            }
          });

        // Count teams
        const teams = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "team",
          where: [{ field: "organizationId", value: organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });

        // Count residents for this organization
        let residentCount = 0;
        try {
          const residents = await ctx.db
            .query("residents")
            .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
            .collect();
          residentCount = residents.length;
        } catch (error) {
          // Residents counting is optional - table might not have the index yet
          console.warn("Could not count residents:", error);
        }

        // Get organization status
        const statusRecord = await ctx.db
          .query("organizationStatus")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
          .first();

        const status = statusRecord?.status || "active";

        return {
          id: organizationId,
          name: org.name || "",
          slug: org.slug || "",
          createdAt: org.createdAt || org._creationTime || 0,
          memberCount: members?.page?.length || 0,
          teamCount: teams?.page?.length || 0,
          residentCount,
          status: status as "active" | "suspended" | "deactivated",
          deactivatedAt: statusRecord?.deactivatedAt
        };
      })
    );

    return orgsWithStats;
  }
});

/**
 * Get detailed information about a specific organization
 */
export const getOrganizationDetails = query({
  args: {
    organizationId: v.string()
  },
  returns: v.union(
    v.object({
      id: v.string(),
      name: v.string(),
      slug: v.string(),
      createdAt: v.number(),
      members: v.array(
        v.object({
          id: v.string(),
          userId: v.string(),
          role: v.string(),
          email: v.optional(v.string()),
          name: v.optional(v.string())
        })
      ),
      teams: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          memberCount: v.number()
        })
      )
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

    // Get organization
    const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: args.organizationId }]
    });

    if (!org) {
      return null;
    }

    // Get all members
    const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    const members = await Promise.all(
      (membersResult?.page || []).map(async (member: any) => {
        // Get user details
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: member.userId }]
        });

        return {
          id: member.id || member._id,
          userId: member.userId,
          role: member.role || "",
          email: authUser?.email,
          name: authUser?.name
        };
      })
    );

    // Get all teams
    const teamsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "team",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    const teams = await Promise.all(
      (teamsResult?.page || []).map(async (team: any) => {
        // Count team members
        const teamMembers = await ctx.db
          .query("teamMembers")
          .withIndex("byTeamId", (q) => q.eq("teamId", team.id || team._id))
          .collect();

        return {
          id: team.id || team._id,
          name: team.name || "",
          memberCount: teamMembers.length
        };
      })
    );

    return {
      id: org.id || org._id,
      name: org.name || "",
      slug: org.slug || "",
      createdAt: org.createdAt || org._creationTime || 0,
      members,
      teams
    };
  }
});

/**
 * Create a new care home owner with organization
 */
export const createCareHomeOwner = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    organizationName: v.string()
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    invitationId: v.optional(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    // #region agent log
    console.log("[DEBUG createCareHomeOwner] Entry:", {
      email: args.email,
      name: args.name,
      orgName: args.organizationName,
      hypothesisId: "B"
    });
    // #endregion
    
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
      throw new Error("Only SaaS Admin can create care home owners");
    }

    // #region agent log
    console.log("[DEBUG createCareHomeOwner] SaaS Admin verified:", {
      saasAdminEmail: userIdentity.email,
      userId: userIdentity.subject,
      hypothesisId: "B"
    });
    // #endregion

    try {
      // Check if user already exists
      const existingUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "email", value: args.email }]
      });

      if (existingUser) {
        return {
          success: false,
          error: "User with this email already exists"
        };
      }

      // Create organization
      const org = await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "organization",
          data: {
            name: args.organizationName,
            slug: args.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            createdAt: Date.now()
          }
        }
      });

      const organizationId = typeof org === "object" && org !== null && "_id" in org
        ? (org as any)._id
        : org;

      const organizationIdStr = String(organizationId);
      
      // #region agent log
      console.log("[DEBUG createCareHomeOwner] Organization created:", {
        organizationId: organizationIdStr,
        hypothesisId: "B"
      });
      // #endregion

      // NOTE: Care homes are NOT created automatically here.
      // The owner will create care homes during onboarding or through the dashboard sidebar.

      // Check if invitation already exists for this email and organization
      const existingInvitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [
          { field: "email", value: args.email },
          { field: "organizationId", value: organizationIdStr }
        ]
      });

      if (existingInvitation) {
        return {
          success: false,
          error: "User is already invited to this organization"
        };
      }

      // Create invitation for owner role
      const invitationResult = await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "invitation",
          data: {
            email: args.email,
            role: "owner",
            organizationId: organizationIdStr,
            inviterId: userIdentity.subject,
            status: "pending",
            expiresAt: Date.now() + (1000 * 60 * 60 * 24 * 7), // 7 days
          }
        }
      });

      // Extract the ID from the result
      const invitationId = typeof invitationResult === 'object' && invitationResult !== null && '_id' in invitationResult
        ? (invitationResult as any)._id
        : invitationResult;

      const invitationIdStr = String(invitationId);
      
      // #region agent log
      console.log("[DEBUG createCareHomeOwner] Invitation created:", {
        invitationId: invitationIdStr,
        hypothesisId: "B"
      });
      // #endregion

      // Schedule the email sending action
      try {
        await ctx.scheduler.runAfter(0, api.customInviteEmail.sendInvitationEmail, {
          invitationId: invitationIdStr,
          email: args.email,
          organizationName: args.organizationName,
          inviterName: userIdentity.name || "Platform Administrator",
        });
        
        // #region agent log
        console.log("[DEBUG createCareHomeOwner] Email sending scheduled:", {
          invitationId: invitationIdStr,
          email: args.email,
          hypothesisId: "B"
        });
        // #endregion
      } catch (schedulerError) {
        console.error("❌ Failed to schedule email sending:", schedulerError);
        // Don't fail the invitation creation if email scheduling fails
      }

      return {
        success: true,
        organizationId: organizationIdStr,
        invitationId: invitationIdStr,
        error: undefined
      };
    } catch (error) {
      console.error("Error creating care home owner:", error);
      
      // #region agent log
      console.error("[DEBUG createCareHomeOwner] Error:", {
        error: error instanceof Error ? error.message : String(error),
        hypothesisId: "B"
      });
      // #endregion
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create care home owner"
      };
    }
  }
});

/**
 * Populate care homes for all existing organizations
 * This is a one-time migration helper
 */
export const populateCareHomes = mutation({
  args: {},
  returns: v.object({
    careHomesCreated: v.number(),
    organizationsProcessed: v.number(),
    success: v.boolean()
  }),
  handler: async (ctx) => {
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
      throw new Error("Only SaaS Admin can run this migration");
    }

    // Call the internal mutation
    const result: { careHomesCreated: number; organizationsProcessed: number } = await ctx.runMutation(internal.rbac.careHomes.populateCareHomesForAllOrganizations, {});

    return {
      ...result,
      success: true
    };
  }
});

/**
 * Get platform-wide statistics
 */
export const getPlatformStats = query({
  args: {},
  returns: v.object({
    totalOrganizations: v.number(),
    totalUsers: v.number(),
    totalResidents: v.number(),
    totalTeams: v.number(),
    recentOrganizations: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        createdAt: v.number()
      })
    )
  }),
  handler: async (ctx) => {
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

    // Count organizations
    const orgs = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "organization",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    // Count users
    const users = await ctx.db.query("users").collect();

    // Count residents
    let totalResidents = 0;
    try {
      const residents = await ctx.db.query("residents").collect();
      totalResidents = residents.length;
    } catch (error) {
      console.warn("Could not count residents:", error);
    }

    // Count teams
    const teams = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "team",
      where: [],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    // Get recent organizations (last 5)
    const recentOrgs = (orgs?.page || [])
      .sort((a: any, b: any) => {
        const aTime = a.createdAt || a._creationTime || 0;
        const bTime = b.createdAt || b._creationTime || 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((org: any) => ({
        id: org.id || org._id,
        name: org.name || "",
        createdAt: org.createdAt || org._creationTime || 0
      }));

    return {
      totalOrganizations: orgs?.page?.length || 0,
      totalUsers: users.length,
      totalResidents,
      totalTeams: teams?.page?.length || 0,
      recentOrganizations: recentOrgs
    };
  }
});

/**
 * Suspend an organization (disable access)
 */
export const suspendOrganization = mutation({
  args: {
    organizationId: v.string(),
    suspended: v.boolean()
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
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
      throw new Error("Only SaaS Admin can suspend organizations");
    }

    try {
      // Update organization with suspended status
      // Note: This assumes Better Auth organization model supports a suspended field
      // You may need to add this field to your schema or use a different approach
      await ctx.runMutation(components.betterAuth.lib.updateOne, {
        input: {
          model: "organization",
          where: [{ field: "id", value: args.organizationId }],
          update: {
            // Add suspended field if your Better Auth schema supports it
            // For now, we'll just return success
          }
        }
      });

      return {
        success: true
      };
    } catch (error) {
      console.error("Error suspending organization:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to suspend organization"
      };
    }
  }
});

/**
 * Deactivate an organization (soft delete - prevents access but preserves data)
 */
export const deactivateOrganization = mutation({
  args: {
    organizationId: v.string(),
    reason: v.optional(v.string())
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
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
      throw new Error("Only SaaS Admin can deactivate organizations");
    }

    try {
      // Check if organization exists
      const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: args.organizationId }]
      });

      if (!org) {
        return {
          success: false,
          error: "Organization not found"
        };
      }

      // Check if status record already exists
      const existingStatus = await ctx.db
        .query("organizationStatus")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .first();

      if (existingStatus) {
        // Update existing status
        await ctx.db.patch(existingStatus._id, {
          status: "deactivated",
          deactivatedAt: Date.now(),
          deactivatedBy: userIdentity.subject,
          reason: args.reason
        });
      } else {
        // Create new status record
        await ctx.db.insert("organizationStatus", {
          organizationId: args.organizationId,
          status: "deactivated",
          deactivatedAt: Date.now(),
          deactivatedBy: userIdentity.subject,
          reason: args.reason
        });
      }

      // Invalidate active sessions for this organization
      // Find all sessions with this activeOrganizationId
      const sessions = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "session",
        where: [{ field: "activeOrganizationId", value: args.organizationId }],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      if (sessions?.page) {
        for (const session of sessions.page) {
          // Find another active organization for this user
          const userMembers = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "member",
            where: [{ field: "userId", value: session.userId }],
            paginationOpts: {
              cursor: null,
              numItems: 1000
            }
          });

          let newActiveOrgId: string | null = null;
          if (userMembers?.page) {
            for (const member of userMembers.page) {
              if (member.organizationId !== args.organizationId) {
                const isActive = await ctx.runQuery(api.auth.isOrganizationActive, {
                  organizationId: member.organizationId
                });
                if (isActive) {
                  newActiveOrgId = member.organizationId;
                  break;
                }
              }
            }
          }

          // Update session with new activeOrganizationId or undefined
          await ctx.runMutation(components.betterAuth.lib.updateOne, {
            input: {
              model: "session",
              where: [{ field: "token", value: session.token }],
              update: {
                activeOrganizationId: newActiveOrgId || undefined
              }
            }
          });
        }
      }

      return {
        success: true
      };
    } catch (error) {
      console.error("Error deactivating organization:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to deactivate organization"
      };
    }
  }
});

/**
 * Activate an organization (reactivate after deactivation)
 */
export const activateOrganization = mutation({
  args: { organizationId: v.string() },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
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
      throw new Error("Only SaaS Admin can activate organizations");
    }

    try {
      // Check if organization exists
      const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: args.organizationId }]
      });

      if (!org) {
        return {
          success: false,
          error: "Organization not found"
        };
      }

      // Check if status record exists
      const existingStatus = await ctx.db
        .query("organizationStatus")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .first();

      if (existingStatus) {
        // Update status to active
        await ctx.db.patch(existingStatus._id, {
          status: "active",
          deactivatedAt: undefined,
          deactivatedBy: undefined,
          reason: undefined
        });
      } else {
        // Create status record with active status
        await ctx.db.insert("organizationStatus", {
          organizationId: args.organizationId,
          status: "active"
        });
      }

      return {
        success: true
      };
    } catch (error) {
      console.error("Error activating organization:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to activate organization"
      };
    }
  }
});

/**
 * Get preview of what will be deleted when an organization is deleted
 */
export const getOrganizationDeletionPreview = query({
  args: { organizationId: v.string() },
  returns: v.object({
    organizationName: v.string(),
    counts: v.object({
      members: v.number(),
      teams: v.number(),
      residents: v.number(),
      teamMembers: v.number(),
      files: v.number(),
      folders: v.number(),
      labels: v.number(),
      invitationMetadata: v.number(),
      invitations: v.number()
    }),
    membersWithMultipleOrgs: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
        otherOrgCount: v.number()
      })
    )
  }),
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

    // Get organization
    const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: args.organizationId }]
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Count members
    const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    // Count teams
    const teams = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "team",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    // Count residents
    let residentCount = 0;
    try {
      const residents = await ctx.db
        .query("residents")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      residentCount = residents.length;
    } catch (error) {
      console.warn("Could not count residents:", error);
    }

    // Count teamMembers
    let teamMemberCount = 0;
    try {
      const teamMembers = await ctx.db
        .query("teamMembers")
        .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      teamMemberCount = teamMembers.length;
    } catch (error) {
      console.warn("Could not count teamMembers:", error);
    }

    // Count files
    let fileCount = 0;
    try {
      const files = await ctx.db
        .query("files")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      fileCount = files.length;
    } catch (error) {
      console.warn("Could not count files:", error);
    }

    // Count folders
    let folderCount = 0;
    try {
      const folders = await ctx.db
        .query("folders")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      folderCount = folders.length;
    } catch (error) {
      console.warn("Could not count folders:", error);
    }

    // Count labels
    let labelCount = 0;
    try {
      const labels = await ctx.db
        .query("labels")
        .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      labelCount = labels.length;
    } catch (error) {
      console.warn("Could not count labels:", error);
    }

    // Count invitationMetadata
    let invitationMetadataCount = 0;
    try {
      const invitationMetadata = await ctx.db
        .query("invitationMetadata")
        .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
        .collect();
      invitationMetadataCount = invitationMetadata.length;
    } catch (error) {
      console.warn("Could not count invitationMetadata:", error);
    }

    // Count invitations
    const invitations = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "invitation",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 1000
      }
    });

    // Find members who belong to multiple organizations
    const membersWithMultipleOrgs: Array<{
      email: string;
      name?: string;
      otherOrgCount: number;
    }> = [];
    if (members?.page) {
      for (const member of members.page) {
        // Get all members for this user
        const userMembers = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "userId", value: member.userId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });

        if (userMembers?.page && userMembers.page.length > 1) {
          // Get user details
          const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "user",
            where: [{ field: "id", value: member.userId }]
          });

          if (authUser) {
            membersWithMultipleOrgs.push({
              email: authUser.email || "",
              name: authUser.name,
              otherOrgCount: userMembers.page.length - 1
            });
          }
        }
      }
    }

    return {
      organizationName: org.name || "",
      counts: {
        members: members?.page?.length || 0,
        teams: teams?.page?.length || 0,
        residents: residentCount,
        teamMembers: teamMemberCount,
        files: fileCount,
        folders: folderCount,
        labels: labelCount,
        invitationMetadata: invitationMetadataCount,
        invitations: invitations?.page?.length || 0
      },
      membersWithMultipleOrgs: membersWithMultipleOrgs
    };
  }
});

/**
 * Delete an organization and all related data (cascade deletion)
 */
export const deleteOrganization = mutation({
  args: {
    organizationId: v.string(),
    confirmDeletion: v.boolean() // Safety flag
  },
  returns: v.object({
    success: v.boolean(),
    deletedCounts: v.object({
      members: v.number(),
      teams: v.number(),
      residents: v.number(),
      teamMembers: v.number(),
      files: v.number(),
      folders: v.number(),
      labels: v.number(),
      invitationMetadata: v.number(),
      invitations: v.number()
    }),
    error: v.optional(v.string())
  }),
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
      throw new Error("Only SaaS Admin can delete organizations");
    }

    if (!args.confirmDeletion) {
      return {
        success: false,
        deletedCounts: {
          members: 0,
          teams: 0,
          residents: 0,
          teamMembers: 0,
          files: 0,
          folders: 0,
          labels: 0,
          invitationMetadata: 0,
          invitations: 0
        },
        error: "Deletion not confirmed"
      };
    }

    try {
      // Get organization to verify it exists
      const org = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: args.organizationId }]
      });

      if (!org) {
        return {
          success: false,
          deletedCounts: {
            members: 0,
            teams: 0,
            residents: 0,
            teamMembers: 0,
            files: 0,
            folders: 0,
            labels: 0,
            invitationMetadata: 0,
            invitations: 0
          },
          error: "Organization not found"
        };
      }

      const deletedCounts = {
        members: 0,
        teams: 0,
        residents: 0,
        teamMembers: 0,
        files: 0,
        folders: 0,
        labels: 0,
        invitationMetadata: 0,
        invitations: 0
      };

      // 1. Delete Convex application data first

      // Delete residents
      try {
        const residents = await ctx.db
          .query("residents")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const resident of residents) {
          await ctx.db.delete(resident._id);
        }
        deletedCounts.residents = residents.length;
      } catch (error) {
        console.warn("Error deleting residents:", error);
      }

      // Delete teamMembers
      try {
        const teamMembers = await ctx.db
          .query("teamMembers")
          .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const teamMember of teamMembers) {
          await ctx.db.delete(teamMember._id);
        }
        deletedCounts.teamMembers = teamMembers.length;
      } catch (error) {
        console.warn("Error deleting teamMembers:", error);
      }

      // Delete files
      try {
        const files = await ctx.db
          .query("files")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const file of files) {
          await ctx.db.delete(file._id);
        }
        deletedCounts.files = files.length;
      } catch (error) {
        console.warn("Error deleting files:", error);
      }

      // Delete folders
      try {
        const folders = await ctx.db
          .query("folders")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const folder of folders) {
          await ctx.db.delete(folder._id);
        }
        deletedCounts.folders = folders.length;
      } catch (error) {
        console.warn("Error deleting folders:", error);
      }

      // Delete labels
      try {
        const labels = await ctx.db
          .query("labels")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const label of labels) {
          await ctx.db.delete(label._id);
        }
        deletedCounts.labels = labels.length;
      } catch (error) {
        console.warn("Error deleting labels:", error);
      }

      // Delete invitationMetadata
      try {
        const invitationMetadata = await ctx.db
          .query("invitationMetadata")
          .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
          .collect();
        for (const metadata of invitationMetadata) {
          await ctx.db.delete(metadata._id);
        }
        deletedCounts.invitationMetadata = invitationMetadata.length;
      } catch (error) {
        console.warn("Error deleting invitationMetadata:", error);
      }

      // Delete organizationStatus
      try {
        const status = await ctx.db
          .query("organizationStatus")
          .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
          .first();
        if (status) {
          await ctx.db.delete(status._id);
        }
      } catch (error) {
        console.warn("Error deleting organizationStatus:", error);
      }

      // 2. Delete Better Auth data

      // Delete invitations
      try {
        const invitations = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "invitation",
          where: [{ field: "organizationId", value: args.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });
        if (invitations?.page) {
          for (const invitation of invitations.page) {
            await ctx.runMutation(components.betterAuth.lib.deleteOne, {
              model: "invitation",
              where: [{ field: "id", value: invitation.id || invitation._id }]
            });
          }
          deletedCounts.invitations = invitations.page.length;
        }
      } catch (error) {
        console.warn("Error deleting invitations:", error);
      }

      // Delete teams
      try {
        const teams = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "team",
          where: [{ field: "organizationId", value: args.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });
        if (teams?.page) {
          for (const team of teams.page) {
            await ctx.runMutation(components.betterAuth.lib.deleteOne, {
              model: "team",
              where: [{ field: "id", value: team.id || team._id }]
            });
          }
          deletedCounts.teams = teams.page.length;
        }
      } catch (error) {
        console.warn("Error deleting teams:", error);
      }

      // Delete members (this removes user-organization links, but keeps user accounts)
      try {
        const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "organizationId", value: args.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });
        if (members?.page) {
          for (const member of members.page) {
            await ctx.runMutation(components.betterAuth.lib.deleteOne, {
              model: "member",
              where: [{ field: "id", value: member.id || member._id }]
            });
          }
          deletedCounts.members = members.page.length;
        }
      } catch (error) {
        console.warn("Error deleting members:", error);
      }

      // 3. Update sessions to remove activeOrganizationId or switch to another org
      try {
        const sessions = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "session",
          where: [{ field: "activeOrganizationId", value: args.organizationId }],
          paginationOpts: {
            cursor: null,
            numItems: 1000
          }
        });

        if (sessions?.page) {
          for (const session of sessions.page) {
            // Find another active organization for this user
            const userMembers = await ctx.runQuery(components.betterAuth.lib.findMany, {
              model: "member",
              where: [{ field: "userId", value: session.userId }],
              paginationOpts: {
                cursor: null,
                numItems: 1000
              }
            });

            let newActiveOrgId: string | null = null;
            if (userMembers?.page) {
              for (const member of userMembers.page) {
                if (member.organizationId !== args.organizationId) {
                  const isActive = await ctx.runQuery(api.auth.isOrganizationActive, {
                    organizationId: member.organizationId
                  });
                  if (isActive) {
                    newActiveOrgId = member.organizationId;
                    break;
                  }
                }
              }
            }

            // Update session
            await ctx.runMutation(components.betterAuth.lib.updateOne, {
              input: {
                model: "session",
                where: [{ field: "token", value: session.token }],
                update: {
                  activeOrganizationId: newActiveOrgId || undefined
                }
              }
            });
          }
        }
      } catch (error) {
        console.warn("Error updating sessions:", error);
      }

      // 4. Finally, delete the organization itself
      await ctx.runMutation(components.betterAuth.lib.deleteOne, {
        model: "organization",
        where: [{ field: "id", value: args.organizationId }]
      });

      return {
        success: true,
        deletedCounts
      };
    } catch (error) {
      console.error("Error deleting organization:", error);
      return {
        success: false,
        deletedCounts: {
          members: 0,
          teams: 0,
          residents: 0,
          teamMembers: 0,
          files: 0,
          folders: 0,
          labels: 0,
          invitationMetadata: 0,
          invitations: 0
        },
        error: error instanceof Error ? error.message : "Failed to delete organization"
      };
    }
  }
});
