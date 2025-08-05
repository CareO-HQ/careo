import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new label for an organization
 */
export const createLabel = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    organizationId: v.string()
  },
  returns: v.id("labels"),
  handler: async (ctx, args) => {
    const { name, color, organizationId } = args;

    // Check if a label with the same name already exists in this organization
    const existingLabel = await ctx.db
      .query("labels")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .filter((q) => q.eq(q.field("name"), name))
      .first();

    if (existingLabel) {
      throw new Error(
        `Label with name "${name}" already exists in this organization`
      );
    }

    // Create the new label
    const labelId = await ctx.db.insert("labels", {
      name,
      color,
      organizationId
    });

    return labelId;
  }
});

/**
 * Get all labels for a specific organization
 */
export const getLabelsByOrganization = query({
  args: {
    organizationId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("labels"),
      _creationTime: v.number(),
      name: v.string(),
      color: v.string(),
      organizationId: v.string()
    })
  ),
  handler: async (ctx, args) => {
    const { organizationId } = args;

    // Get all labels for the organization
    const labels = await ctx.db
      .query("labels")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("asc")
      .collect();

    return labels;
  }
});

/**
 * Delete a label
 */
export const deleteLabel = mutation({
  args: {
    labelId: v.id("labels")
  },
  handler: async (ctx, args) => {
    const { labelId } = args;

    // Delete the label
    await ctx.db.delete(labelId);
  }
});
