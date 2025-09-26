import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create or update a section issue (only one per section per resident)
export const createOrUpdateSectionIssue = mutation({
  args: {
    residentId: v.id("residents"),
    section: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    assigneeId: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    organizationId: v.string(),
    teamId: v.string()
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

    // Check if issue already exists for this section
    const existingIssue = await ctx.db
      .query("sectionIssues")
      .withIndex("byResidentAndSection", (q) =>
        q.eq("residentId", args.residentId).eq("section", args.section)
      )
      .first();

    if (existingIssue) {
      // Update existing issue
      return await ctx.db.patch(existingIssue._id, {
        title: args.title,
        description: args.description,
        priority: args.priority,
        assigneeId: args.assigneeId,
        dueDate: args.dueDate,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      // Create new issue
      return await ctx.db.insert("sectionIssues", {
        residentId: args.residentId,
        section: args.section,
        title: args.title,
        description: args.description,
        status: "open",
        priority: args.priority,
        assigneeId: args.assigneeId,
        dueDate: args.dueDate,
        organizationId: args.organizationId,
        teamId: args.teamId,
        createdAt: Date.now(),
        createdBy: user._id,
      });
    }
  },
});

// Get section issue for a specific resident and section
export const getSectionIssue = query({
  args: {
    residentId: v.id("residents"),
    section: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sectionIssues")
      .withIndex("byResidentAndSection", (q) =>
        q.eq("residentId", args.residentId).eq("section", args.section)
      )
      .first();
  },
});

// Get all issues for a resident
export const getIssuesByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sectionIssues")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .collect();
  },
});

// Update issue status
export const updateIssueStatus = mutation({
  args: {
    issueId: v.id("sectionIssues"),
    status: v.union(
      v.literal("open"),
      v.literal("in-progress"),
      v.literal("resolved"),
      v.literal("closed")
    )
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
      status: args.status,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (args.status === "resolved" || args.status === "closed") {
      updateData.resolvedAt = Date.now();
      updateData.resolvedBy = user._id;
    }

    return await ctx.db.patch(args.issueId, updateData);
  },
});

// Delete a section issue
export const deleteSectionIssue = mutation({
  args: {
    issueId: v.id("sectionIssues")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.delete(args.issueId);
  },
});