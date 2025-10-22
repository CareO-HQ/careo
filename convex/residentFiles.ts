import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Create a file record after upload
export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    originalName: v.string(),
    size: v.optional(v.number()),
    extension: v.optional(v.string()),
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // VALIDATION: Enforce 10MB file size limit
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (args.size && args.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 10MB limit");
    }

    // VALIDATION: Check if folder already has 50 files
    if (args.parentFolderId) {
      const filesInFolder = await ctx.db
        .query("files")
        .withIndex("byParentFolderId", (q) =>
          q.eq("parentFolderId", args.parentFolderId)
        )
        .filter((q) => q.eq(q.field("type"), "resident"))
        .collect();

      if (filesInFolder.length >= 50) {
        throw new Error("Folder has reached maximum limit of 50 files");
      }
    }

    // Get user from identity
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) throw new Error("User not found");

    const fileId = await ctx.db.insert("files", {
      body: args.storageId,
      name: args.name,
      originalName: args.originalName,
      size: args.size,
      extension: args.extension,
      uploadedBy: identity.subject,
      uploadedAt: Date.now(),
      organizationId: args.organizationId,
      teamId: args.teamId,
      parentFolderId: args.parentFolderId,
      labels: args.labels,
      userId: user._id,
      format: args.extension || "unknown",
      type: "resident",
    });

    return fileId;
  },
});

// Get files for a resident
export const getByResident = query({
  args: {
    residentId: v.id("residents"),
    parentFolderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get resident to access organizationId and teamId
    const resident = await ctx.db.get(args.residentId);
    if (!resident) return [];

    let files;
    if (args.parentFolderId) {
      files = await ctx.db
        .query("files")
        .withIndex("byParentFolderId", (q) =>
          q.eq("parentFolderId", args.parentFolderId)
        )
        .filter((q) => q.eq(q.field("type"), "resident"))
        .collect();
    } else {
      files = await ctx.db
        .query("files")
        .withIndex("byOrganizationId", (q) =>
          q.eq("organizationId", resident.organizationId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("teamId"), resident.teamId),
            q.eq(q.field("type"), "resident"),
            q.eq(q.field("parentFolderId"), undefined)
          )
        )
        .collect();
    }

    // Get file URLs and user info
    const filesWithDetails = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.body);
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), file.userId))
          .first();

        return {
          ...file,
          url,
          uploadedByName: user?.name || user?.email || "Unknown",
        };
      })
    );

    return filesWithDetails;
  },
});

// Get file URL
export const getUrl = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    const url = await ctx.storage.getUrl(file.body);
    return url;
  },
});

// Delete file
export const remove = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    // Delete from storage
    await ctx.storage.delete(file.body);

    // Delete record
    await ctx.db.delete(args.fileId);
  },
});
