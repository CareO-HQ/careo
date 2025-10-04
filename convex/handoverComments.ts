import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Save or update a handover comment (real-time auto-save)
export const saveComment = mutation({
  args: {
    teamId: v.string(),
    residentId: v.id("residents"),
    date: v.string(), // YYYY-MM-DD
    shift: v.union(v.literal("day"), v.literal("night")),
    comment: v.string(),
    createdBy: v.string(),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if comment already exists
    const existingComment = await ctx.db
      .query("handoverComments")
      .withIndex("by_team_resident", (q) =>
        q.eq("teamId", args.teamId)
          .eq("residentId", args.residentId)
          .eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("shift"), args.shift))
      .first();

    if (existingComment) {
      // Update existing comment
      await ctx.db.patch(existingComment._id, {
        comment: args.comment,
        updatedAt: now,
      });
      return existingComment._id;
    } else {
      // Create new comment
      const commentId = await ctx.db.insert("handoverComments", {
        teamId: args.teamId,
        residentId: args.residentId,
        date: args.date,
        shift: args.shift,
        comment: args.comment,
        createdBy: args.createdBy,
        createdByName: args.createdByName,
        createdAt: now,
        updatedAt: now,
      });
      return commentId;
    }
  },
});

// Get comment for a specific resident on a specific date/shift
export const getComment = query({
  args: {
    teamId: v.string(),
    residentId: v.id("residents"),
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db
      .query("handoverComments")
      .withIndex("by_team_resident", (q) =>
        q.eq("teamId", args.teamId)
          .eq("residentId", args.residentId)
          .eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("shift"), args.shift))
      .first();

    return comment;
  },
});

// Get all comments for a team on a specific date/shift
export const getCommentsByTeamDateShift = query({
  args: {
    teamId: v.string(),
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("handoverComments")
      .withIndex("by_team_date_shift", (q) =>
        q.eq("teamId", args.teamId)
          .eq("date", args.date)
          .eq("shift", args.shift)
      )
      .collect();

    return comments;
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: {
    commentId: v.id("handoverComments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commentId);
  },
});

// Delete all comments for a specific date/shift (called after archiving)
export const deleteCommentsAfterArchive = mutation({
  args: {
    teamId: v.string(),
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("handoverComments")
      .withIndex("by_team_date_shift", (q) =>
        q.eq("teamId", args.teamId)
          .eq("date", args.date)
          .eq("shift", args.shift)
      )
      .collect();

    // Delete all comments
    await Promise.all(comments.map((comment) => ctx.db.delete(comment._id)));

    return { deleted: comments.length };
  },
});

// Get comment with metadata (for showing save status)
export const getCommentWithMetadata = query({
  args: {
    teamId: v.string(),
    residentId: v.id("residents"),
    date: v.string(),
    shift: v.union(v.literal("day"), v.literal("night")),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db
      .query("handoverComments")
      .withIndex("by_team_resident", (q) =>
        q.eq("teamId", args.teamId)
          .eq("residentId", args.residentId)
          .eq("date", args.date)
      )
      .filter((q) => q.eq(q.field("shift"), args.shift))
      .first();

    if (!comment) return null;

    return {
      comment: comment.comment,
      lastSavedAt: comment.updatedAt,
      savedBy: comment.createdByName,
    };
  },
});
