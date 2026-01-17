import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { resolveUser, resolveCareHome, ROLES } from "./lib/rbac";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.string(),
    nhsHealthNumber: v.optional(v.string()),
    // GP Details
    gpName: v.optional(v.string()),
    gpAddress: v.optional(v.string()),
    gpPhone: v.optional(v.string()),
    // Care Manager Details
    careManagerName: v.optional(v.string()),
    careManagerAddress: v.optional(v.string()),
    careManagerPhone: v.optional(v.string()),
    healthConditions: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            condition: v.string()
          })
        )
      )
    ),
    risks: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            risk: v.string(),
            level: v.optional(
              v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
            )
          })
        )
      )
    ),
    dependencies: v.optional(
      v.union(
        v.array(v.string()), // Legacy format for backward compatibility
        v.object({
          mobility: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          eating: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          dressing: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          toileting: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          )
        })
      )
    ),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string()
  },
  returns: v.id("residents"),
  handler: async (ctx, args) => {
    // RBAC: Resolve user and check permissions
    const { user, role, organizationId: userOrgId, activeUnitId } = await resolveUser(ctx);
    const effectiveRole = role ?? (activeUnitId ? ROLES.NURSE : ROLES.MANAGER);
    if (!role) {
      console.warn(
        "[create] No role found for user; using fallback role",
        { effectiveRole }
      );
    }

    // Care Assistants cannot create residents
    if (effectiveRole === ROLES.CARE_ASSISTANT) {
      throw new Error("Unauthorized: Care assistants cannot create residents");
    }

    // Enforce organization scope (unless SaaS Admin)
    if (effectiveRole !== ROLES.SAAS_ADMIN && args.organizationId !== userOrgId) {
      throw new Error("Unauthorized: Cannot create resident in different organization");
    }

    // Verify unit access for Nurse (Care Assistants already excluded above)
    if (effectiveRole === ROLES.NURSE) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.subject) {
        throw new Error("Unauthorized: User identity not found");
      }

      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .first();

      if (!unit) {
        // No unit linked to this team yet: allow if user is a team member.
        const teamMembership = await ctx.db
          .query("teamMembers")
          .withIndex("byUserAndTeam", (q) =>
            q.eq("userId", identity.subject).eq("teamId", args.teamId)
          )
          .first();

        if (!teamMembership) {
          throw new Error("Unauthorized: Unit not found for selected team");
        }

        // Team membership is enough when units are not configured.
      } else {
        // If activeUnitId is set, ensure it matches the selected team/unit.
        if (activeUnitId && unit._id !== activeUnitId) {
          throw new Error("Unauthorized: Cannot create resident in unit you're not assigned to");
        }

        // If activeUnitId is missing, validate assignment via unitStaff.
        if (!activeUnitId) {
          const assignments = await ctx.db
            .query("unitStaff")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .collect();

          const isAssignedToUnit = assignments.some(
            (assignment) => assignment.unitId === unit._id
          );

          if (!isAssignedToUnit) {
            throw new Error("Unauthorized: Cannot create resident in unit you're not assigned to");
          }
        }
      }
    }

    const now = Date.now();

    const residentId = await ctx.db.insert("residents", {
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      phoneNumber: args.phoneNumber,
      roomNumber: args.roomNumber,
      admissionDate: args.admissionDate,
      nhsHealthNumber: args.nhsHealthNumber,
      // GP Details
      gpName: args.gpName,
      gpAddress: args.gpAddress,
      gpPhone: args.gpPhone,
      // Care Manager Details
      careManagerName: args.careManagerName,
      careManagerAddress: args.careManagerAddress,
      careManagerPhone: args.careManagerPhone,
      healthConditions: args.healthConditions,
      risks: args.risks,
      dependencies: args.dependencies,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      isActive: true
    });

    return residentId;
  }
});

export const createEmergencyContact = mutation({
  args: {
    residentId: v.id("residents"),
    name: v.string(),
    phoneNumber: v.string(),
    relationship: v.string(),
    address: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    organizationId: v.string()
  },
  returns: v.id("emergencyContacts"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const contactId = await ctx.db.insert("emergencyContacts", {
      residentId: args.residentId,
      name: args.name,
      phoneNumber: args.phoneNumber,
      relationship: args.relationship,
      address: args.address,
      isPrimary: args.isPrimary ?? false,
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now
    });

    return contactId;
  }
});

export const getByOrganization = query({
  args: {
    organizationId: v.optional(v.string()),
    careHomeId: v.optional(v.id("careHomes"))
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    // RBAC: Resolve user and enforce tenant isolation
    const { user, role, organizationId: userOrgId, activeUnitId } = await resolveUser(ctx);
    const effectiveRole = role ?? (activeUnitId ? ROLES.NURSE : ROLES.MANAGER);
    if (!role) {
      console.warn(
        "[getByOrganization] No role found for user; using fallback role",
        { effectiveRole }
      );
    }

    // Determine target organization
    const targetOrgId = args.organizationId || userOrgId;

    if (!targetOrgId) {
      throw new Error("Organization ID required");
    }

    // SaaS Admin can read all, others must match their organization
    if (effectiveRole !== ROLES.SAAS_ADMIN && targetOrgId !== userOrgId) {
      throw new Error("Unauthorized: Cannot access different organization");
    }

    // Resolve care home context
    let targetCareHomeId: Id<"careHomes"> | null = null;
    if (args.careHomeId) {
      // Verify user can access the specified care home
      const careHome = await ctx.db.get(args.careHomeId);
      if (
        careHome &&
        (effectiveRole === ROLES.SAAS_ADMIN || careHome.organizationId === targetOrgId)
      ) {
        targetCareHomeId = args.careHomeId;
      }
    } else {
      // Get active care home for user
      targetCareHomeId = await resolveCareHome(ctx);
    }

    // Build query with organization filter
    let query = ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", targetOrgId)
      )
      .filter((q) => q.eq(q.field("isActive"), true));

    // Apply care home filter for Manager and Owner
    if (targetCareHomeId && (effectiveRole === ROLES.MANAGER || effectiveRole === ROLES.OWNER)) {
      console.log(`[getByOrganization] Filtering for ${effectiveRole}. CareHomeId: ${targetCareHomeId}`);

      // Get all units in this care home
      const units = await ctx.db
        .query("units")
        .withIndex("by_careHomeId", (q) => q.eq("careHomeId", targetCareHomeId!))
        .collect();

      const teamIds = new Set(units.map(u => u.teamId));

      // Filter residents by team IDs in this care home
      if (teamIds.size > 0) {
        // Get all residents first, then filter by team IDs
        const allResidents = await query.collect();
        const filteredResidents = allResidents.filter((resident: any) =>
          teamIds.has(resident.teamId)
        );

        // Process residents with images
        const results: Array<Record<string, unknown>> = [];
        for (const resident of filteredResidents) {
          const residentImage: { url: string | null; storageId: string } | null =
            await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
              residentId: resident._id as string
            });
          results.push({
            ...resident,
            imageUrl: residentImage?.url || "No image"
          });
        }

        return results;
      } else {
        // No units in this care home, return empty
        return [];
      }
    }

    // Apply unit filter for Nurse/Care Assistant
    if (effectiveRole === ROLES.NURSE || effectiveRole === ROLES.CARE_ASSISTANT) {
      if (activeUnitId) {
        const unit = await ctx.db.get(activeUnitId);
        if (!unit) {
          console.warn(`[RBAC] Access denied: User's active unit ${activeUnitId} not found`);
          return [];
        }
        query = query.filter((q) => q.eq(q.field("teamId"), unit.teamId));
      } else if (user.activeTeamId) {
        // Allow team-based access when unit context isn't set
        query = query.filter((q) => q.eq(q.field("teamId"), user.activeTeamId));
      } else {
        console.warn(`[RBAC] Access denied: User has no active unit or team`);
        return [];
      }
    }

    const residents = await query.collect();

    // Process residents with images
    const results: Array<Record<string, unknown>> = [];
    for (const resident of residents) {
      const residentImage: { url: string | null; storageId: string } | null =
        await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
          residentId: resident._id as string
        });
      results.push({
        ...resident,
        imageUrl: residentImage?.url || "No image"
      });
    }

    return results;
  }
});

export const getById = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args): Promise<any | null> => {
    // RBAC: Resolve user and check access
    const { user, role, organizationId, activeUnitId } = await resolveUser(ctx);
    const effectiveRole = role ?? (activeUnitId ? ROLES.NURSE : ROLES.MANAGER);

    const resident = await ctx.db.get(args.residentId);
    if (!resident) return null;

    if (!role) {
      console.warn(
        "[getById] No role found for user; using fallback role",
        { effectiveRole }
      );
    }

    // SaaS Admin can read all
    if (effectiveRole !== ROLES.SAAS_ADMIN) {
      // Enforce organization isolation
      if (resident.organizationId !== organizationId) {
        throw new Error("Unauthorized: Resident does not belong to your organization");
      }

      // For Manager, verify care home access
      if (effectiveRole === ROLES.MANAGER) {
        // Get unit for this resident
        const unit = await ctx.db
          .query("units")
          .withIndex("by_teamId", (q) => q.eq("teamId", resident.teamId))
          .first();

        if (unit) {
          // Check if manager is assigned to this care home
          const identity = await ctx.auth.getUserIdentity();
          if (identity?.subject) {
            const managerAssignment = await ctx.db
              .query("careHomeManagers")
              .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
              .filter((q) => q.eq(q.field("userId"), identity.subject))
              .first();

            if (!managerAssignment) {
              throw new Error("Unauthorized: Resident does not belong to a care home you manage");
            }
          }
        }
      }

      // Enforce unit isolation for Nurse/Care Assistant
      if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
        if (activeUnitId) {
          const unit = await ctx.db.get(activeUnitId);
          if (!unit || resident.teamId !== unit.teamId) {
            console.warn(`[RBAC] Access denied: User attempted to access resident ${args.residentId} from team ${resident.teamId} but active team is ${unit?.teamId || 'none'}`);
            throw new Error("Unauthorized: Resident does not belong to your active unit");
          }
        } else if (user.activeTeamId) {
          if (resident.teamId !== user.activeTeamId) {
            console.warn(`[RBAC] Access denied: User attempted to access resident ${args.residentId} from team ${resident.teamId} but active team is ${user.activeTeamId}`);
            throw new Error("Unauthorized: Resident does not belong to your active team");
          }
        } else {
          console.warn(`[RBAC] Access denied: User attempted to access resident ${args.residentId} without active unit or team`);
          throw new Error("Unauthorized: You must have an active team to access residents");
        }
      }
    }

    const emergencyContacts = await ctx.db
      .query("emergencyContacts")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    const residentImage: { url: string | null; storageId: string } | null =
      await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
        residentId: resident._id as string
      });

    return {
      ...resident,
      emergencyContacts,
      imageUrl: residentImage?.url || "No image"
    };
  }
});

export const getByTeamId = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    // RBAC: Resolve user and enforce access
    const { user, role, organizationId, activeUnitId } = await resolveUser(ctx);
    const effectiveRole = role ?? (activeUnitId ? ROLES.NURSE : ROLES.MANAGER);
    if (!role) {
      console.warn(
        "[getByTeamId] No role found for user; using fallback role",
        { effectiveRole }
      );
    }

    // For Nurse/Care Assistant: verify they're accessing their active team
    if (effectiveRole === ROLES.NURSE || effectiveRole === ROLES.CARE_ASSISTANT) {
      if (activeUnitId) {
        const unit = await ctx.db.get(activeUnitId);
        if (!unit || unit.teamId !== args.teamId) {
          console.warn(`[RBAC] Access denied: User attempted to access team ${args.teamId} but active team is ${unit?.teamId || 'none'}`);
          return [];
        }
      } else if (user.activeTeamId) {
        if (user.activeTeamId !== args.teamId) {
          console.warn(`[RBAC] Access denied: User attempted to access team ${args.teamId} but active team is ${user.activeTeamId}`);
          return [];
        }
      } else {
        console.warn(`[RBAC] Access denied: User attempted to access team ${args.teamId} without active unit or team`);
        return [];
      }
    }

    // For Manager: verify team belongs to a care home they manage
    if (effectiveRole === ROLES.MANAGER) {
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .first();

      if (unit) {
        const identity = await ctx.auth.getUserIdentity();
        if (identity?.subject) {
          const managerAssignment = await ctx.db
            .query("careHomeManagers")
            .withIndex("by_careHomeId", (q) => q.eq("careHomeId", unit.careHomeId))
            .filter((q) => q.eq(q.field("userId"), identity.subject))
            .first();

          if (!managerAssignment) {
            console.warn(`[RBAC] Access denied: Manager attempted to access team ${args.teamId} in care home they don't manage`);
            return [];
          }
        }
      }
    }

    // SaaS Admin can access all, Owner can access all in their organization
    if (effectiveRole !== ROLES.SAAS_ADMIN && effectiveRole !== ROLES.OWNER) {
      // Verify team belongs to user's organization
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .first();

      if (unit && unit.organizationId !== organizationId) {
        console.warn(`[RBAC] Access denied: User attempted to access team ${args.teamId} from different organization`);
        return [];
      }
    }

    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Process residents with images
    const results: Array<Record<string, unknown>> = [];
    for (const resident of residents) {
      const residentImage: { url: string | null; storageId: string } | null =
        await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
          residentId: resident._id as string
        });
      results.push({
        ...resident,
        imageUrl: residentImage?.url || "No image"
      });
    }

    return results;
  }
});

export const updateEmergencyContact = mutation({
  args: {
    contactId: v.id("emergencyContacts"),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    relationship: v.optional(v.string()),
    address: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  returns: v.id("emergencyContacts"),
  handler: async (ctx, args) => {
    const { contactId, ...updateFields } = args;

    // Remove undefined fields
    const fieldsToUpdate: Record<string, any> = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined)
    );

    // Add updatedAt timestamp
    fieldsToUpdate.updatedAt = Date.now();

    await ctx.db.patch(contactId, fieldsToUpdate);

    return contactId;
  }
});

export const update = mutation({
  args: {
    residentId: v.id("residents"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.optional(v.string()),
    nhsHealthNumber: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // GP Details
    gpName: v.optional(v.string()),
    gpAddress: v.optional(v.string()),
    gpPhone: v.optional(v.string()),
    // Care Manager Details
    careManagerName: v.optional(v.string()),
    careManagerAddress: v.optional(v.string()),
    careManagerPhone: v.optional(v.string()),
    healthConditions: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            condition: v.string()
          })
        )
      )
    ),
    risks: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            risk: v.string(),
            level: v.optional(
              v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
            )
          })
        )
      )
    ),
    dependencies: v.optional(
      v.union(
        v.array(v.string()), // Legacy format for backward compatibility
        v.object({
          mobility: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          eating: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          dressing: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          toileting: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          )
        })
      )
    ),
  },
  returns: v.id("residents"),
  handler: async (ctx, args) => {
    const { residentId, ...updateFields } = args;

    // Remove undefined fields
    const fieldsToUpdate: Record<string, any> = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined)
    );

    // Add updatedAt timestamp
    fieldsToUpdate.updatedAt = Date.now();

    await ctx.db.patch(residentId, fieldsToUpdate);

    return residentId;
  }
});

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// Helper function to calculate length of stay
const calculateLengthOfStay = (admissionDate: string): { days: number; months: number; years: number } => {
  const today = new Date();
  const admission = new Date(admissionDate);
  const diffTime = Math.abs(today.getTime() - admission.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const years = Math.floor(diffDays / 365);
  const remainingDays = diffDays % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;

  return { days: diffDays, months, years };
};

// Audit log mutation
export const logAuditEntry = mutation({
  args: {
    residentId: v.id("residents"),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("viewed"),
      v.literal("discharged"),
      v.literal("status_changed"),
      v.literal("deleted")
    ),
    userId: v.string(),
    userName: v.optional(v.string()),
    changes: v.optional(v.any()),
    fieldChanged: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("residentAuditLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get audit log for a resident
export const getAuditLog = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("residentAuditLog")
      .withIndex("byResidentAndTimestamp", (q) =>
        q.eq("residentId", args.residentId)
      )
      .order("desc")
      .take(limit);
  },
});

// Optimized query to get resident with all related data
export const getResidentOverview = query({
  args: {
    residentId: v.id("residents"),
    includeAuditLog: v.optional(v.boolean()),
  },
  returns: v.union(v.null(), v.any()),
  handler: async (ctx, args): Promise<any> => {
    const resident = await ctx.db.get(args.residentId);

    if (!resident) {
      return null;
    }

    // Fetch all related data in parallel
    const [contacts, residentImage, auditLog]: [any, any, any] = await Promise.all([
      ctx.db
        .query("emergencyContacts")
        .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
        .collect(),
      ctx.runQuery(api.files.image.getResidentImageByResidentId, {
        residentId: resident._id as string
      }),
      args.includeAuditLog
        ? ctx.db
          .query("residentAuditLog")
          .withIndex("byResidentAndTimestamp", (q) =>
            q.eq("residentId", args.residentId)
          )
          .order("desc")
          .take(10)
        : Promise.resolve([])
    ]);

    // Calculate age and length of stay on backend
    const age = calculateAge(resident.dateOfBirth);
    const lengthOfStay = calculateLengthOfStay(resident.admissionDate);

    return {
      ...resident,
      age,
      lengthOfStay,
      emergencyContacts: contacts,
      imageUrl: residentImage?.url || "No image",
      recentAuditLog: auditLog,
    };
  },
});

// Get active residents only (for filtering out discharged/deceased)
export const getActiveByTeamId = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<any[]> => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamAndStatus", (q) =>
        q.eq("teamId", args.teamId).eq("status", "active")
      )
      .collect();

    // Process residents with images
    const results: any[] = [];
    for (const resident of residents) {
      const residentImage: any = await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
        residentId: resident._id as string
      });

      results.push({
        ...resident,
        age: calculateAge(resident.dateOfBirth),
        imageUrl: residentImage?.url || "No image"
      });
    }

    return results;
  }
});

// Update resident status with audit logging
export const updateResidentStatus = mutation({
  args: {
    residentId: v.id("residents"),
    status: v.union(
      v.literal("active"),
      v.literal("discharged"),
      v.literal("deceased"),
      v.literal("transferred"),
      v.literal("hospital")
    ),
    reason: v.optional(v.string()),
    userId: v.string(),
    userName: v.optional(v.string()),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);

    if (!resident) {
      throw new Error("Resident not found");
    }

    const oldStatus = resident.status || "active";
    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    // Set discharge date if being discharged
    if (args.status === "discharged" || args.status === "deceased") {
      updateData.dischargeDate = Date.now();
      updateData.dischargeReason = args.reason;
      // Set data retention date (7 years for healthcare records in UK)
      updateData.dataRetentionUntil = Date.now() + (7 * 365 * 24 * 60 * 60 * 1000);
    }

    await ctx.db.patch(args.residentId, updateData);

    // Log the status change
    await ctx.db.insert("residentAuditLog", {
      residentId: args.residentId,
      action: "status_changed",
      userId: args.userId,
      userName: args.userName,
      changes: {
        before: { status: oldStatus },
        after: { status: args.status, reason: args.reason }
      },
      organizationId: args.organizationId,
      timestamp: Date.now(),
    });

    return args.residentId;
  },
});
