"use node";

import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { Resend } from "resend";

const isResendEnabled = process.env.RESEND_ENABLED === "true";
const apiKey = process.env.RESEND_API_KEY;

const resend = (isResendEnabled && apiKey) ? new Resend(apiKey) : null;

export const sendEmailWithPDFAttachment = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    pdfStorageId: v.id("_storage"),
    filename: v.optional(v.string())
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    try {
      // Get file metadata from your files table
      const fileRecord = await ctx.runQuery(
        internal.emailHelpers.getFileByStorageId,
        {
          storageId: args.pdfStorageId
        }
      );

      // We can proceed even if fileRecord is null, as long as the file exists in storage

      // Get the file content from Convex storage
      const blob = await ctx.storage.get(args.pdfStorageId);
      if (!blob) {
        throw new Error(`File content not found: ${args.pdfStorageId}`);
      }

      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString("base64");

      const attachment = {
        content: base64Content,
        filename:
          args.filename ||
          fileRecord?.originalName ||
          fileRecord?.name ||
          `document.pdf`
      };

      // Send email with attachment
      if (!resend) {
        console.log("Resend is disabled. Email would have been sent to:", args.to);
        return {
          success: true,
          messageId: "mock-id-resend-disabled"
        };
      }

      const result = await resend.emails.send({
        from: args.from || "Careo <noreply@auth.tryuprio.com>",
        to: [args.to],
        subject: args.subject,
        html: args.html,
        attachments: [attachment]
      });

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error) {
      console.error("Error sending email with PDF:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
});

export const sendEmailWithMultiplePDFs = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    pdfStorageIds: v.array(v.id("_storage"))
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    try {
      // Get PDF files metadata and content
      const attachments = [];

      for (const fileId of args.pdfStorageIds) {
        // Get file metadata from your files table
        const fileRecord = await ctx.runQuery(
          internal.emailHelpers.getFileByStorageId,
          {
            storageId: fileId
          }
        );

        // We can proceed even if fileRecord is null, as long as the file exists in storage

        // Get the file content from Convex storage
        const blob = await ctx.storage.get(fileId);
        if (!blob) {
          throw new Error(`File content not found: ${fileId}`);
        }

        // Convert blob to base64
        const arrayBuffer = await blob.arrayBuffer();
        const base64Content = Buffer.from(arrayBuffer).toString("base64");

        attachments.push({
          content: base64Content,
          filename:
            fileRecord?.originalName || fileRecord?.name || `file_${fileId}.pdf`
        });
      }

      // Send email with attachments
      if (!resend) {
        console.log("Resend is disabled. Email would have been sent to:", args.to);
        return {
          success: true,
          messageId: "mock-id-resend-disabled"
        };
      }

      const result = await resend.emails.send({
        from: args.from || "Careo <noreply@auth.tryuprio.com>",
        to: [args.to],
        subject: args.subject,
        html: args.html,
        attachments
      });

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error) {
      console.error("Error sending email with PDFs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
});
