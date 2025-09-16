import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Generate an upload URL for PDF files
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  }
});

/**
 * Save uploaded PDF to care file folder
 */
export const uploadPdf = mutation({
  args: {
    fileId: v.id("_storage"),
    name: v.string(),
    originalName: v.string(),
    folderName: v.string(),
    residentId: v.id("residents"),
    organizationId: v.string(),
    teamId: v.string(),
    uploadedBy: v.string(),
    size: v.optional(v.number())
  },
  returns: v.id("careFilePdfs"),
  handler: async (ctx, args) => {
    // Verify the file exists in storage
    const fileMetadata = await ctx.db.system.get(args.fileId);
    if (!fileMetadata) {
      throw new Error("File not found in storage");
    }

    // Verify it's a PDF
    if (fileMetadata.contentType !== "application/pdf") {
      throw new Error("Only PDF files are allowed");
    }

    // Create the care file PDF record
    const pdfId = await ctx.db.insert("careFilePdfs", {
      name: args.name,
      originalName: args.originalName,
      fileId: args.fileId,
      folderName: args.folderName,
      residentId: args.residentId,
      organizationId: args.organizationId,
      teamId: args.teamId,
      uploadedBy: args.uploadedBy,
      uploadedAt: Date.now(),
      size: args.size || fileMetadata.size,
      isActive: true
    });

    return pdfId;
  }
});

/**
 * Get PDFs for a specific resident and folder
 */
export const getPdfsByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderName: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("careFilePdfs"),
      _creationTime: v.number(),
      name: v.string(),
      originalName: v.string(),
      fileId: v.id("_storage"),
      folderName: v.string(),
      residentId: v.id("residents"),
      organizationId: v.string(),
      teamId: v.string(),
      uploadedBy: v.string(),
      uploadedAt: v.number(),
      size: v.optional(v.number()),
      isActive: v.optional(v.boolean())
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careFilePdfs")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderName", args.folderName)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  }
});

/**
 * Get PDF download URL
 */
export const getPdfUrl = query({
  args: {
    pdfId: v.id("careFilePdfs")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf || !pdf.isActive) {
      return null;
    }

    return await ctx.storage.getUrl(pdf.fileId);
  }
});

/**
 * Rename a PDF file
 */
export const renamePdf = mutation({
  args: {
    pdfId: v.id("careFilePdfs"),
    newName: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      throw new Error("PDF not found");
    }

    await ctx.db.patch(args.pdfId, {
      name: args.newName
    });

    return null;
  }
});

/**
 * Delete a PDF file (soft delete)
 */
export const deletePdf = mutation({
  args: {
    pdfId: v.id("careFilePdfs")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      throw new Error("PDF not found");
    }

    // Soft delete by setting isActive to false
    await ctx.db.patch(args.pdfId, {
      isActive: false
    });

    return null;
  }
});

/**
 * Get PDF metadata including uploader information
 */
export const getPdfWithUserInfo = query({
  args: {
    pdfId: v.id("careFilePdfs")
  },
  returns: v.union(
    v.object({
      _id: v.id("careFilePdfs"),
      _creationTime: v.number(),
      name: v.string(),
      originalName: v.string(),
      fileId: v.id("_storage"),
      folderName: v.string(),
      residentId: v.id("residents"),
      organizationId: v.string(),
      teamId: v.string(),
      uploadedBy: v.string(),
      uploadedAt: v.number(),
      size: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      uploaderName: v.optional(v.string())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf || !pdf.isActive) {
      return null;
    }

    // Get uploader information
    const uploader = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), pdf.uploadedBy))
      .first();

    return {
      ...pdf,
      uploaderName: uploader?.name
    };
  }
});
