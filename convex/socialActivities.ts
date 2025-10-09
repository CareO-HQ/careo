import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new social activity record
export const createSocialActivity = mutation({
  args: {
    residentId: v.id("residents"),
    activityDate: v.string(),
    activityTime: v.string(),
    activityType: v.union(
      v.literal("group_activity"),
      v.literal("one_on_one"),
      v.literal("family_visit"),
      v.literal("outing"),
      v.literal("entertainment"),
      v.literal("exercise"),
      v.literal("crafts"),
      v.literal("music"),
      v.literal("reading"),
      v.literal("games"),
      v.literal("therapy"),
      v.literal("religious"),
      v.literal("other")
    ),
    activityName: v.string(),
    participants: v.optional(v.string()),
    location: v.optional(v.string()),
    duration: v.optional(v.string()),
    engagementLevel: v.optional(
      v.union(
        v.literal("very_engaged"),
        v.literal("engaged"),
        v.literal("somewhat_engaged"),
        v.literal("minimal"),
        v.literal("disengaged")
      )
    ),
    moodBefore: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("neutral"),
        v.literal("poor"),
        v.literal("very_poor")
      )
    ),
    moodAfter: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("neutral"),
        v.literal("poor"),
        v.literal("very_poor")
      )
    ),
    socialInteraction: v.optional(
      v.union(
        v.literal("active"),
        v.literal("responsive"),
        v.literal("minimal"),
        v.literal("withdrawn")
      )
    ),
    enjoyment: v.optional(
      v.union(
        v.literal("loved_it"),
        v.literal("enjoyed"),
        v.literal("neutral"),
        v.literal("disliked"),
        v.literal("refused")
      )
    ),
    recordedBy: v.string(),
    organizationId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const activityId = await ctx.db.insert("socialActivities", {
      residentId: args.residentId,
      activityDate: args.activityDate,
      activityTime: args.activityTime,
      activityType: args.activityType,
      activityName: args.activityName,
      participants: args.participants,
      location: args.location,
      duration: args.duration,
      engagementLevel: args.engagementLevel,
      moodBefore: args.moodBefore,
      moodAfter: args.moodAfter,
      socialInteraction: args.socialInteraction,
      enjoyment: args.enjoyment,
      recordedBy: args.recordedBy,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      createdAt: now,
    });

    return activityId;
  },
});

// Get all social activities for a resident (with optional pagination)
export const getSocialActivitiesByResidentId = query({
  args: {
    residentId: v.id("residents"),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      // Return paginated results
      return await ctx.db
        .query("socialActivities")
        .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      // Return all results
      return await ctx.db
        .query("socialActivities")
        .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
        .order("desc")
        .collect();
    }
  },
});

// Get recent social activities for a resident (limited to most recent)
export const getRecentSocialActivities = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    return await ctx.db
      .query("socialActivities")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .take(limit);
  },
});

// Get paginated social activities for a resident with total count
export const getPaginatedSocialActivities = query({
  args: {
    residentId: v.id("residents"),
    page: v.number(),
    pageSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Get total count
    const allActivities = await ctx.db
      .query("socialActivities")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    const totalCount = allActivities.length;
    const totalPages = Math.ceil(totalCount / args.pageSize);

    // Get paginated results
    const skip = (args.page - 1) * args.pageSize;
    const activities = await ctx.db
      .query("socialActivities")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .take(skip + args.pageSize);

    // Slice to get only the current page
    const pageActivities = activities.slice(skip, skip + args.pageSize);

    return {
      activities: pageActivities,
      totalCount,
      totalPages,
      currentPage: args.page,
    };
  },
});

// Get all social activities for an organization
export const getSocialActivitiesByOrganization = query({
  args: {
    organizationId: v.string(),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("socialActivities")
        .withIndex("byOrganizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      return await ctx.db
        .query("socialActivities")
        .withIndex("byOrganizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .order("desc")
        .collect();
    }
  },
});

// Get social activities by date range for a resident
export const getSocialActivitiesByDateRange = query({
  args: {
    residentId: v.id("residents"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("socialActivities")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    // Filter by date range
    return activities.filter(
      (activity) =>
        activity.activityDate >= args.startDate &&
        activity.activityDate <= args.endDate
    );
  },
});

// Delete a social activity record
export const deleteSocialActivity = mutation({
  args: {
    activityId: v.id("socialActivities"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.activityId);
    return true;
  },
});

// Delete all social activities (for migration/cleanup)
export const deleteAllSocialActivities = mutation({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db.query("socialActivities").collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    return { deleted: activities.length };
  },
});

// Update a social activity record
export const updateSocialActivity = mutation({
  args: {
    activityId: v.id("socialActivities"),
    activityDate: v.optional(v.string()),
    activityTime: v.optional(v.string()),
    activityType: v.optional(
      v.union(
        v.literal("group_activity"),
        v.literal("one_on_one"),
        v.literal("family_visit"),
        v.literal("outing"),
        v.literal("entertainment"),
        v.literal("exercise"),
        v.literal("crafts"),
        v.literal("music"),
        v.literal("reading"),
        v.literal("games"),
        v.literal("therapy"),
        v.literal("religious"),
        v.literal("other")
      )
    ),
    activityName: v.optional(v.string()),
    participants: v.optional(v.string()),
    location: v.optional(v.string()),
    duration: v.optional(v.string()),
    engagementLevel: v.optional(
      v.union(
        v.literal("very_engaged"),
        v.literal("engaged"),
        v.literal("somewhat_engaged"),
        v.literal("minimal"),
        v.literal("disengaged")
      )
    ),
    moodBefore: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("neutral"),
        v.literal("poor"),
        v.literal("very_poor")
      )
    ),
    moodAfter: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("neutral"),
        v.literal("poor"),
        v.literal("very_poor")
      )
    ),
    socialInteraction: v.optional(
      v.union(
        v.literal("active"),
        v.literal("responsive"),
        v.literal("minimal"),
        v.literal("withdrawn")
      )
    ),
    enjoyment: v.optional(
      v.union(
        v.literal("loved_it"),
        v.literal("enjoyed"),
        v.literal("neutral"),
        v.literal("disliked"),
        v.literal("refused")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { activityId, ...updates } = args;

    // Remove undefined values
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(activityId, cleanedUpdates);
    return activityId;
  },
});
