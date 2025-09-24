import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper query to get PDF storage ID from form data (public version)
export const getPDFStorageId = query({
  args: {
    formKey: v.string(),
    formId: v.string()
  },
  returns: v.union(v.id("_storage"), v.null()),
  handler: async (ctx, args) => {
    const { formKey, formId } = args;

    // Query the appropriate table based on form key
    switch (formKey) {
      case "preAdmission-form": {
        const form = await ctx.db.get(formId as Id<"preAdmissionCareFiles">);
        return form?.pdfFileId || null;
      }
      case "infection-prevention": {
        const assessment = await ctx.db.get(
          formId as Id<"infectionPreventionAssessments">
        );
        return assessment?.pdfFileId || null;
      }
      case "blader-bowel-form": {
        const assessment = await ctx.db.get(
          formId as Id<"bladderBowelAssessments">
        );
        return assessment?.pdfFileId || null;
      }
      case "moving-handling-form": {
        const assessment = await ctx.db.get(
          formId as Id<"movingHandlingAssessments">
        );
        return assessment?.pdfFileId || null;
      }
      case "long-term-fall-risk-form": {
        const assessment = await ctx.db.get(
          formId as Id<"longTermFallsRiskAssessments">
        );
        return assessment?.pdfFileId || null;
      }
      case "care-plan-form": {
        const assessment = await ctx.db.get(
          formId as Id<"carePlanAssessments">
        );
        return assessment?.pdfFileId || null;
      }
      case "admission-form": {
        const assessment = await ctx.db.get(
          formId as Id<"admissionAssesments">
        );
        return assessment?.pdfFileId || null;
      }
      case "photography-consent": {
        const consent = await ctx.db.get(formId as Id<"photographyConsents">);
        return consent?.pdfFileId || null;
      }
      default:
        return null;
    }
  }
});

// Internal helper query to get file metadata by storage ID
export const getFileByStorageId = internalQuery({
  args: {
    storageId: v.id("_storage")
  },
  returns: v.union(
    v.object({
      name: v.optional(v.string()),
      originalName: v.optional(v.string()),
      size: v.optional(v.number()),
      contentType: v.optional(v.string()),
      sha256: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // First try to find in the files table (for manually uploaded files)
    const file = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("body"), args.storageId))
      .first();

    if (file) {
      return {
        name: file.name,
        originalName: file.originalName,
        size: file.size,
        contentType: "application/pdf",
        sha256: "unknown"
      };
    }

    // If not found in files table, get metadata from storage system table
    const storageMetadata = await ctx.db.system.get(args.storageId);

    if (!storageMetadata) return null;

    return {
      name: undefined,
      originalName: undefined,
      size: storageMetadata.size,
      contentType: storageMetadata.contentType || undefined,
      sha256: storageMetadata.sha256
    };
  }
});
