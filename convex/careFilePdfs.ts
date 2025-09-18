import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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

/**
 * Get all files and URLs for folder download
 */
export const getAllFilesForFolderDownload = action({
  args: {
    residentId: v.id("residents"),
    folderName: v.string(),
    forms: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
        type: v.optional(v.string()),
        description: v.optional(v.string())
      })
    ),
    includeCareplanFiles: v.boolean()
  },
  returns: v.array(
    v.object({
      filename: v.string(),
      url: v.string(),
      type: v.union(
        v.literal("custom_pdf"),
        v.literal("form_pdf"),
        v.literal("care_plan")
      )
    })
  ),
  handler: async (ctx, args) => {
    const files: Array<{
      filename: string;
      url: string;
      type: "custom_pdf" | "form_pdf" | "care_plan";
    }> = [];

    // Get custom uploaded PDFs
    const customPdfs = await ctx.runQuery(
      api.careFilePdfs.getPdfsByResidentAndFolder,
      {
        residentId: args.residentId,
        folderName: args.folderName
      }
    );

    for (const pdf of customPdfs) {
      const url = await ctx.storage.getUrl(pdf.fileId);
      if (url) {
        files.push({
          filename: `${pdf.name}.pdf`,
          url,
          type: "custom_pdf"
        });
      }
    }

    // Get resident info for filename generation
    const resident = await ctx.runQuery(api.residents.getById, {
      residentId: args.residentId
    });
    const residentName = resident
      ? `${resident.firstName}-${resident.lastName}`
      : "resident";

    // Get generated form PDFs
    for (const form of args.forms) {
      try {
        let url: string | null = null;
        let filename = "";

        switch (form.key) {
          case "preAdmission-form": {
            const forms = await ctx.runQuery(
              api.careFiles.preadmission.getPreAdmissionFormsByResident,
              { residentId: args.residentId }
            );
            if (forms && forms.length > 0) {
              const latestForm = forms.sort(
                (a, b) => b._creationTime - a._creationTime
              )[0];
              url = await ctx.runQuery(api.careFiles.preadmission.getPDFUrl, {
                formId: latestForm._id
              });
              filename = `pre-admission-assessment-${residentName}.pdf`;
            }
            break;
          }
          case "infection-prevention": {
            const forms = await ctx.runQuery(
              api.careFiles.infectionPrevention
                .getInfectionPreventionAssessmentsByResident,
              { residentId: args.residentId }
            );
            if (forms && forms.length > 0) {
              const latestForm = forms.sort(
                (a, b) => b._creationTime - a._creationTime
              )[0];
              url = await ctx.runQuery(
                api.careFiles.infectionPrevention.getPDFUrl,
                {
                  assessmentId: latestForm._id
                }
              );
              filename = `infection-prevention-assessment-${residentName}.pdf`;
            }
            break;
          }
          case "blader-bowel-form": {
            const forms = await ctx.runQuery(
              api.careFiles.bladderBowel.getBladderBowelAssessmentsByResident,
              { residentId: args.residentId }
            );
            if (forms && forms.length > 0) {
              const latestForm = forms.sort(
                (a, b) => b._creationTime - a._creationTime
              )[0];
              url = await ctx.runQuery(api.careFiles.bladderBowel.getPDFUrl, {
                assessmentId: latestForm._id
              });
              filename = `bladder-bowel-assessment-${residentName}.pdf`;
            }
            break;
          }
          case "moving-handling-form": {
            const forms = await ctx.runQuery(
              api.careFiles.movingHandling
                .getMovingHandlingAssessmentsByResident,
              { residentId: args.residentId }
            );
            if (forms && forms.length > 0) {
              const latestForm = forms.sort(
                (a, b) => b._creationTime - a._creationTime
              )[0];
              url = await ctx.runQuery(api.careFiles.movingHandling.getPDFUrl, {
                assessmentId: latestForm._id
              });
              filename = `moving-handling-assessment-${residentName}.pdf`;
            }
            break;
          }
          case "long-term-fall-risk-form": {
            // Get organization ID from the resident
            const orgId = resident?.organizationId;
            if (orgId) {
              const form = await ctx.runQuery(
                api.careFiles.longTermFalls.getLatestAssessmentByResident,
                { residentId: args.residentId, organizationId: orgId }
              );
              if (form) {
                url = await ctx.runQuery(
                  api.careFiles.longTermFalls.getPDFUrl,
                  {
                    assessmentId: form._id
                  }
                );
                filename = `long-term-falls-assessment-${residentName}.pdf`;
              }
            }
            break;
          }
        }

        if (url && filename) {
          files.push({
            filename,
            url,
            type: "form_pdf"
          });
        }
      } catch (error) {
        console.error(`Error getting PDF for form ${form.key}:`, error);
        // Continue with other forms
      }
    }

    // Get care plan files if requested
    if (args.includeCareplanFiles) {
      try {
        const carePlans = await ctx.runQuery(
          api.careFiles.carePlan.getCarePlanAssessmentsByResident,
          { residentId: args.residentId }
        );

        if (carePlans && carePlans.length > 0) {
          for (const plan of carePlans) {
            try {
              const url = await ctx.runQuery(api.careFiles.carePlan.getPDFUrl, {
                assessmentId: plan._id
              });
              if (url) {
                const planName = plan.nameOfCarePlan || "Care Plan Assessment";
                files.push({
                  filename: `${planName}-${residentName}.pdf`,
                  url,
                  type: "care_plan"
                });
              }
            } catch (error) {
              console.error(`Error getting care plan PDF:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error getting care plans:", error);
      }
    }

    return files;
  }
});
