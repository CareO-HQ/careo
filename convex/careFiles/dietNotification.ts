import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitDietNotification = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Header & Administrative Information
    residentName: v.string(),
    roomNumber: v.string(),
    completedBy: v.string(),
    printName: v.string(),
    jobRole: v.string(),
    signature: v.string(),
    dateCompleted: v.number(),
    reviewDate: v.number(),

    // Dietary Preferences & Risks
    likesFavouriteFoods: v.optional(v.string()),
    dislikes: v.optional(v.string()),
    foodsToBeAvoided: v.optional(v.string()),
    chokingRiskAssessment: v.union(
      v.literal("Low Risk"),
      v.literal("Medium Risk"),
      v.literal("High Risk")
    ),

    // Meal & Fluid Specifications
    preferredMealSize: v.union(
      v.literal("Small"),
      v.literal("Standard"),
      v.literal("Large")
    ),
    assistanceRequired: v.optional(v.string()),
    dietType: v.optional(v.string()),

    // Food Consistency (IDDSI Levels)
    foodConsistencyLevel7Regular: v.optional(v.boolean()),
    foodConsistencyLevel7EasyChew: v.optional(v.boolean()),
    foodConsistencyLevel6SoftBiteSized: v.optional(v.boolean()),
    foodConsistencyLevel5MincedMoist: v.optional(v.boolean()),
    foodConsistencyLevel4Pureed: v.optional(v.boolean()),
    foodConsistencyLevel3Liquidised: v.optional(v.boolean()),

    // Fluid Consistency (IDDSI Levels)
    fluidConsistencyLevel4ExtremelyThick: v.optional(v.boolean()),
    fluidConsistencyLevel3ModeratelyThick: v.optional(v.boolean()),
    fluidConsistencyLevel2MildlyThick: v.optional(v.boolean()),
    fluidConsistencyLevel1SlightlyThick: v.optional(v.boolean()),
    fluidConsistencyLevel0Thin: v.optional(v.boolean()),

    // Additional Requirements
    fluidRequirements: v.optional(v.string()),
    foodAllergyOrIntolerance: v.optional(v.string()),

    // Kitchen Review
    reviewedByCookChef: v.optional(v.string()),
    reviewerPrintName: v.optional(v.string()),
    reviewerJobTitle: v.optional(v.string()),
    reviewDateKitchen: v.optional(v.number()),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("dietNotifications"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Verify user has access to this resident's organization
    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    // Insert the diet notification
    const notificationId = await ctx.db.insert("dietNotifications", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Header & Administrative Information
      residentName: args.residentName,
      roomNumber: args.roomNumber,
      completedBy: args.completedBy,
      printName: args.printName,
      jobRole: args.jobRole,
      signature: args.signature,
      dateCompleted: args.dateCompleted,
      reviewDate: args.reviewDate,

      // Dietary Preferences & Risks
      likesFavouriteFoods: args.likesFavouriteFoods,
      dislikes: args.dislikes,
      foodsToBeAvoided: args.foodsToBeAvoided,
      chokingRiskAssessment: args.chokingRiskAssessment,

      // Meal & Fluid Specifications
      preferredMealSize: args.preferredMealSize,
      assistanceRequired: args.assistanceRequired,
      dietType: args.dietType,

      // Food Consistency (IDDSI Levels)
      foodConsistencyLevel7Regular: args.foodConsistencyLevel7Regular,
      foodConsistencyLevel7EasyChew: args.foodConsistencyLevel7EasyChew,
      foodConsistencyLevel6SoftBiteSized: args.foodConsistencyLevel6SoftBiteSized,
      foodConsistencyLevel5MincedMoist: args.foodConsistencyLevel5MincedMoist,
      foodConsistencyLevel4Pureed: args.foodConsistencyLevel4Pureed,
      foodConsistencyLevel3Liquidised: args.foodConsistencyLevel3Liquidised,

      // Fluid Consistency (IDDSI Levels)
      fluidConsistencyLevel4ExtremelyThick: args.fluidConsistencyLevel4ExtremelyThick,
      fluidConsistencyLevel3ModeratelyThick: args.fluidConsistencyLevel3ModeratelyThick,
      fluidConsistencyLevel2MildlyThick: args.fluidConsistencyLevel2MildlyThick,
      fluidConsistencyLevel1SlightlyThick: args.fluidConsistencyLevel1SlightlyThick,
      fluidConsistencyLevel0Thin: args.fluidConsistencyLevel0Thin,

      // Additional Requirements
      fluidRequirements: args.fluidRequirements,
      foodAllergyOrIntolerance: args.foodAllergyOrIntolerance,

      // Kitchen Review
      reviewedByCookChef: args.reviewedByCookChef,
      reviewerPrintName: args.reviewerPrintName,
      reviewerJobTitle: args.reviewerJobTitle,
      reviewDateKitchen: args.reviewDateKitchen,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // If not saved as draft, schedule PDF generation
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.dietNotification.generatePDFAndUpdateRecord,
        {
          notificationId
        }
      );
    }

    return notificationId;
  }
});

export const getDietNotification = query({
  args: {
    notificationId: v.id("dietNotifications")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    return notification || null;
  }
});

export const getDietNotificationsByResident = query({
  args: {
    residentId: v.id("residents"),
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Verify resident exists and user has access
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    const notifications = await ctx.db
      .query("dietNotifications")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return notifications;
  }
});

export const deleteDietNotification = mutation({
  args: {
    notificationId: v.id("dietNotifications"),
    organizationId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify notification exists
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Verify user has access to this notification's organization
    if (notification.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to notification");
    }

    // Delete the notification
    await ctx.db.delete(args.notificationId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    notificationId: v.id("dietNotifications")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the notification data
      const notification = await ctx.runQuery(
        internal.careFiles.dietNotification.getNotificationForPDF,
        { notificationId: args.notificationId }
      );

      if (!notification) {
        throw new Error("Notification not found");
      }

      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl?.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return null;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      // Add authentication header if token is available
      if (pdfApiToken) {
        headers["Authorization"] = `Bearer ${pdfApiToken}`;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/diet-notification`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/diet-notification`, {
        method: "POST",
        headers,
        body: JSON.stringify(notification)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/diet-notification`,
        hasToken: !!pdfApiToken,
        notificationId: args.notificationId
      });

      console.log(
        "PDF API response status:",
        pdfResponse.status,
        pdfResponse.statusText
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.log("PDF API error response:", errorText);
        throw new Error(
          `PDF generation failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`
        );
      }

      // Get the PDF as a buffer
      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Convert to Blob for Convex storage
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(pdfBlob);

      // Update the notification record with the PDF file ID
      await ctx.runMutation(internal.careFiles.dietNotification.updatePDFFileId, {
        notificationId: args.notificationId,
        pdfFileId: storageId
      });
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

export const getNotificationForPDF = internalQuery({
  args: {
    notificationId: v.id("dietNotifications")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      return null;
    }

    return notification;
  }
});

export const updatePDFFileId = internalMutation({
  args: {
    notificationId: v.id("dietNotifications"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      pdfFileId: args.pdfFileId,
      status: "submitted",
      submittedAt: Date.now(),
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

export const getPDFUrl = query({
  args: {
    notificationId: v.id("dietNotifications"),
    organizationId: v.string()
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Verify notification exists
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      return null;
    }

    // Verify user has access to this notification's organization
    if (notification.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to notification");
    }

    // Return PDF URL if available
    if (notification.pdfFileId) {
      return await ctx.storage.getUrl(notification.pdfFileId);
    }

    return notification.pdfUrl || null;
  }
});

/**
 * Get archived (non-latest) diet notifications for a resident
 * Returns all notifications except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all notifications for this resident, ordered by creation time (newest first)
    const allNotifications = await ctx.db
      .query("dietNotifications")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allNotifications.length > 1 ? allNotifications.slice(1) : [];
  }
});
