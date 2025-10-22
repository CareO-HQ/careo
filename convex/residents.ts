import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
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

export const getById = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args): Promise<any | null> => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) return null;

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
