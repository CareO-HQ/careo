import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new folder
export const create = mutation({
  args: {
    name: v.string(),
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // VALIDATION: Limit to 10 folders per resident (root level only)
    if (!args.parentFolderId) {
      const existingFolders = await ctx.db
        .query("folders")
        .withIndex("byResidentId", (q) =>
          q.eq("residentId", args.residentId)
        )
        .collect();

      // Count only root folders (no parent)
      const rootFolders = existingFolders.filter(f => !f.parentFolderId);

      if (rootFolders.length >= 10) {
        throw new Error("Maximum limit of 10 folders per resident reached");
      }
    }

    const folderId = await ctx.db.insert("folders", {
      name: args.name,
      residentId: args.residentId,
      organizationId: args.organizationId,
      teamId: args.teamId,
      parentFolderId: args.parentFolderId,
      createdBy: identity.subject,
      description: args.description,
      color: args.color,
      createdAt: Date.now(),
      lastModified: Date.now(),
    });

    return folderId;
  },
});

// Get folders for a resident
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
    parentFolderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all folders for this specific resident using the index
    const allFolders = await ctx.db
      .query("folders")
      .withIndex("byResidentId", (q) =>
        q.eq("residentId", args.residentId)
      )
      .collect();

    // Filter by parent folder if specified
    if (args.parentFolderId) {
      return allFolders.filter(f => f.parentFolderId === args.parentFolderId);
    } else {
      // Return only root folders (no parent)
      return allFolders.filter(f => !f.parentFolderId);
    }
  },
});

// Update folder
export const update = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { folderId, ...updates } = args;
    await ctx.db.patch(folderId, {
      ...updates,
      lastModified: Date.now(),
    });

    return folderId;
  },
});

// Delete folder
export const remove = mutation({
  args: {
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // CRITICAL: Delete all files in the folder first to prevent orphaned files
    const filesInFolder = await ctx.db
      .query("files")
      .withIndex("byParentFolderId", (q) =>
        q.eq("parentFolderId", args.folderId)
      )
      .collect();

    // Delete all files from storage and database
    for (const file of filesInFolder) {
      await ctx.storage.delete(file.body);
      await ctx.db.delete(file._id);
    }

    // Delete any subfolders (if nested folders are supported)
    const subfolders = await ctx.db
      .query("folders")
      .withIndex("byParentFolderId", (q) =>
        q.eq("parentFolderId", args.folderId)
      )
      .collect();

    for (const subfolder of subfolders) {
      // Recursive delete would be needed here for deeply nested folders
      await ctx.db.delete(subfolder._id);
    }

    // Finally delete the folder itself
    await ctx.db.delete(args.folderId);
  },
});
