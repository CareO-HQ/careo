import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Update or create an audit response
export const updateResponse = mutation({
  args: {
    residentId: v.id("residents"),
    questionId: v.string(),
    status: v.optional(v.union(
      v.literal("compliant"),
      v.literal("non-compliant"),
      v.literal("n/a")
    )),
    comments: v.optional(v.string()),
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

    // Check if response already exists
    const existingResponse = await ctx.db
      .query("auditResponses")
      .withIndex("byResidentAndQuestion", (q) =>
        q.eq("residentId", args.residentId).eq("questionId", args.questionId)
      )
      .first();

    if (existingResponse) {
      // Update existing response
      return await ctx.db.patch(existingResponse._id, {
        status: args.status,
        comments: args.comments,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      // Create new response
      return await ctx.db.insert("auditResponses", {
        residentId: args.residentId,
        questionId: args.questionId,
        status: args.status,
        comments: args.comments,
        respondedBy: user._id,
        respondedAt: Date.now(),
        organizationId: args.organizationId,
        teamId: args.teamId,
      });
    }
  },
});

// Get all audit responses for a resident
export const getResponsesByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("auditResponses")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .collect();

    // Convert to a map for easy lookup
    const responseMap: Record<string, any> = {};
    responses.forEach(response => {
      responseMap[response.questionId] = {
        questionId: response.questionId,
        status: response.status,
        comments: response.comments,
      };
    });

    return responseMap;
  },
});

// Get a specific audit response
export const getResponse = query({
  args: {
    residentId: v.id("residents"),
    questionId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditResponses")
      .withIndex("byResidentAndQuestion", (q) =>
        q.eq("residentId", args.residentId).eq("questionId", args.questionId)
      )
      .first();
  },
});

// Delete an audit response
export const deleteResponse = mutation({
  args: {
    responseId: v.id("auditResponses")
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.delete(args.responseId);
  },
});

// Get audit statistics for a resident
export const getAuditStats = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query("auditResponses")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .collect();

    const stats = {
      total: responses.length,
      compliant: responses.filter(r => r.status === "compliant").length,
      nonCompliant: responses.filter(r => r.status === "non-compliant").length,
      na: responses.filter(r => r.status === "n/a").length,
      withComments: responses.filter(r => r.comments && r.comments.trim().length > 0).length,
    };

    return stats;
  },
});