import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new manager audit record for a completed form
 */
export const createAudit = mutation({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile")
    ),
    formId: v.string(),
    residentId: v.id("residents"),
    auditedBy: v.id("users"),
    auditNotes: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.id("managerAudits"),
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("managerAudits", {
      formType: args.formType,
      formId: args.formId,
      residentId: args.residentId,
      auditedBy: args.auditedBy,
      auditNotes: args.auditNotes,
      teamId: args.teamId,
      organizationId: args.organizationId,
      createdAt: now
    });
  }
});

/**
 * Update an existing audit record
 */
export const updateAudit = mutation({
  args: {
    auditId: v.id("managerAudits"),
    auditNotes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { auditId, ...updates } = args;

    await ctx.db.patch(auditId, {
      ...updates,
      updatedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get audits for a specific form
 */
export const getAuditsByForm = query({
  args: {
    formType: v.union(
      v.literal("movingHandlingAssessment"),
      v.literal("infectionPreventionAssessment"),
      v.literal("carePlanAssessment"),
      v.literal("bladderBowelAssessment"),
      v.literal("preAdmissionCareFile")
    ),
    formId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.id("users"),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_form", (q) =>
        q.eq("formType", args.formType).eq("formId", args.formId)
      )
      .order("desc")
      .collect();
  }
});

/**
 * Get audits for a specific resident
 */
export const getAuditsByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.id("users"),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get audits by team
 */
export const getAuditsByTeam = query({
  args: {
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.id("users"),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get audits by auditor
 */
export const getAuditsByAuditor = query({
  args: {
    auditedBy: v.id("users"),
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("managerAudits"),
      _creationTime: v.number(),
      formType: v.string(),
      formId: v.string(),
      residentId: v.id("residents"),
      auditedBy: v.id("users"),
      auditNotes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("managerAudits")
      .withIndex("by_audited_by", (q) => q.eq("auditedBy", args.auditedBy))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();
  }
});

/**
 * Get basic audit statistics for an organization or team
 */
export const getAuditStatistics = query({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number())
  },
  returns: v.object({
    totalAudits: v.number(),
    auditsByFormType: v.record(v.string(), v.number())
  }),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("managerAudits")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    if (args.teamId) {
      query = query.filter((q) => q.eq(q.field("teamId"), args.teamId));
    }

    if (args.fromDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("createdAt"), args.fromDate!));
    }

    if (args.toDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("createdAt"), args.toDate!));
    }

    const audits = await query.collect();

    const stats = {
      totalAudits: audits.length,
      auditsByFormType: {} as Record<string, number>
    };

    for (const audit of audits) {
      // Count by form type
      if (!stats.auditsByFormType[audit.formType]) {
        stats.auditsByFormType[audit.formType] = 0;
      }
      stats.auditsByFormType[audit.formType]++;
    }

    return stats;
  }
});
