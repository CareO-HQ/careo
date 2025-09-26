import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new audit entry
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    section: v.string(),
    question: v.string(),
    questionId: v.string(),
    status: v.union(v.literal("compliant"), v.literal("non-compliant"), v.literal("n/a")),
    comments: v.optional(v.string()),
    assignee: v.optional(v.id("users")),
    auditDate: v.number(),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    organizationId: v.string(),
    teamId: v.string(),
    auditCycle: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return await ctx.db.insert("careoAudits", {
      residentId: args.residentId,
      auditCycle: args.auditCycle,
      section: args.section,
      question: args.question,
      questionId: args.questionId,
      status: args.status,
      comments: args.comments,
      auditedBy: user._id,
      assignee: args.assignee,
      auditDate: args.auditDate,
      dueDate: args.dueDate,
      priority: args.priority,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
      createdBy: user._id,
    });
  },
});

// Update an existing audit entry
export const update = mutation({
  args: {
    auditId: v.id("careoAudits"),
    status: v.optional(v.union(v.literal("compliant"), v.literal("non-compliant"), v.literal("n/a"))),
    comments: v.optional(v.string()),
    assignee: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high")))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (args.status !== undefined) updateData.status = args.status;
    if (args.comments !== undefined) updateData.comments = args.comments;
    if (args.assignee !== undefined) updateData.assignee = args.assignee;
    if (args.dueDate !== undefined) updateData.dueDate = args.dueDate;
    if (args.priority !== undefined) updateData.priority = args.priority;

    return await ctx.db.patch(args.auditId, updateData);
  },
});

// Get audit entries for a specific resident
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
    section: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let auditsQuery = ctx.db
      .query("careoAudits")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId));

    const audits = await auditsQuery.collect();

    // Filter by section if provided
    if (args.section) {
      return audits.filter(audit => audit.section === args.section);
    }

    return audits;
  },
});

// Get audit entries for a specific resident and section
export const getByResidentAndSection = query({
  args: {
    residentId: v.id("residents"),
    section: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careoAudits")
      .withIndex("byResidentAndSection", (q) =>
        q.eq("residentId", args.residentId).eq("section", args.section)
      )
      .collect();
  },
});

// Get all audit entries for an organization
export const getByOrganization = query({
  args: {
    organizationId: v.string(),
    section: v.optional(v.string()),
    status: v.optional(v.union(v.literal("compliant"), v.literal("non-compliant"), v.literal("n/a")))
  },
  handler: async (ctx, args) => {
    const audits = await ctx.db
      .query("careoAudits")
      .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Apply filters
    let filteredAudits = audits;

    if (args.section) {
      filteredAudits = filteredAudits.filter(audit => audit.section === args.section);
    }

    if (args.status) {
      filteredAudits = filteredAudits.filter(audit => audit.status === args.status);
    }

    return filteredAudits;
  },
});

// Get audit entries by assignee
export const getByAssignee = query({
  args: {
    assigneeId: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careoAudits")
      .withIndex("byAssignee", (q) => q.eq("assignee", args.assigneeId))
      .collect();
  },
});

// Delete an audit entry
export const remove = mutation({
  args: {
    auditId: v.id("careoAudits")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.delete(args.auditId);
  },
});

// Initialize audit template for a resident (create all questions for all sections)
export const initializeAuditForResident = mutation({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.string(),
    auditCycle: v.optional(v.string()),
    questions: v.array(v.object({
      questionId: v.string(),
      section: v.string(),
      question: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if audit already exists for this resident and cycle
    const existingAudits = await ctx.db
      .query("careoAudits")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .collect();

    if (existingAudits.length > 0 && args.auditCycle) {
      const cycleExists = existingAudits.some(audit => audit.auditCycle === args.auditCycle);
      if (cycleExists) {
        throw new Error("Audit already exists for this cycle");
      }
    }

    // Create audit entries for all questions
    const auditEntries = args.questions.map(question => ({
      residentId: args.residentId,
      auditCycle: args.auditCycle,
      section: question.section,
      question: question.question,
      questionId: question.questionId,
      auditedBy: user._id,
      auditDate: Date.now(),
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdAt: Date.now(),
      createdBy: user._id,
    }));

    // Insert all entries
    const results = await Promise.all(
      auditEntries.map(entry => ctx.db.insert("careoAudits", entry))
    );

    return results;
  },
});

// Get audit statistics
export const getAuditStats = query({
  args: {
    residentId: v.optional(v.id("residents")),
    organizationId: v.optional(v.string()),
    teamId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let audits;

    // Apply filters
    if (args.residentId) {
      audits = await ctx.db
        .query("careoAudits")
        .withIndex("byResident", (q) => q.eq("residentId", args.residentId!))
        .collect();
    } else if (args.organizationId) {
      audits = await ctx.db
        .query("careoAudits")
        .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId!))
        .collect();
    } else if (args.teamId) {
      audits = await ctx.db
        .query("careoAudits")
        .withIndex("byTeam", (q) => q.eq("teamId", args.teamId!))
        .collect();
    } else {
      audits = await ctx.db.query("careoAudits").collect();
    }

    // Calculate statistics
    const stats = {
      total: audits.length,
      compliant: audits.filter(a => a.status === "compliant").length,
      nonCompliant: audits.filter(a => a.status === "non-compliant").length,
      na: audits.filter(a => a.status === "n/a").length,
      highPriority: audits.filter(a => a.priority === "high").length,
      mediumPriority: audits.filter(a => a.priority === "medium").length,
      lowPriority: audits.filter(a => a.priority === "low").length,
      overdue: audits.filter(a => a.dueDate && a.dueDate < Date.now()).length,
    };

    return stats;
  },
});