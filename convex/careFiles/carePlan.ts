import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitCarePlanAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    userId: v.string(),

    // Folder association
    folderKey: v.optional(v.string()),

    // Basic information
    nameOfCarePlan: v.string(),
    residentName: v.string(),
    dob: v.number(),
    bedroomNumber: v.string(),
    writtenBy: v.string(),
    dateWritten: v.number(),
    carePlanNumber: v.string(),

    // Care plan details
    identifiedNeeds: v.string(),
    aims: v.string(),

    // Planned care entries
    plannedCareDate: v.array(
      v.object({
        date: v.number(),
        time: v.optional(v.string()),
        details: v.string(),
        signature: v.string()
      })
    ),

    // Review of Patient or Representative
    discussedWith: v.optional(v.string()),
    signature: v.optional(v.string()),
    date: v.number(),
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Insert the care plan assessment
    const carePlanId = await ctx.db.insert("carePlanAssessments", {
      residentId: args.residentId,
      userId: args.userId,
      folderKey: args.folderKey,
      nameOfCarePlan: args.nameOfCarePlan,
      residentName: args.residentName,
      dob: args.dob,
      bedroomNumber: args.bedroomNumber,
      writtenBy: args.writtenBy,
      dateWritten: args.dateWritten,
      carePlanNumber: args.carePlanNumber,
      identifiedNeeds: args.identifiedNeeds,
      aims: args.aims,
      plannedCareDate: args.plannedCareDate,
      discussedWith: args.discussedWith,
      signature: args.signature,
      date: args.date,
      staffSignature: args.staffSignature,
      status: "submitted" as const,
      submittedAt: Date.now()
    });

    // Create reminder 30 days after creation
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    await ctx.db.insert("carePlanReminders", {
      carePlanId: carePlanId,
      reminderDate: Date.now() + thirtyDaysInMs,
      reminderStatus: "pending" as const,
      createdBy: args.userId,
      createdAt: Date.now()
    });

    // Schedule PDF generation after successful save if not a draft
    await ctx.scheduler.runAfter(
      1000, // 1 second delay
      internal.careFiles.carePlan.generatePDFAndUpdateRecord,
      { assessmentId: carePlanId }
    );

    return carePlanId;
  }
});

export const getCarePlanAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const getCarePlanAssessmentsByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderKey", args.folderKey)
      )
      .collect();

    return assessments;
  }
});

export const getLatestCarePlanByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string()
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const latestAssessment = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderKey", args.folderKey)
      )
      .order("desc")
      .first();

    return latestAssessment;
  }
});

export const getCarePlanAssessment = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment;
  }
});

export const updateCarePlanAssessment = mutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),

    // Folder association
    folderKey: v.optional(v.string()),

    // Basic information
    nameOfCarePlan: v.string(),
    residentName: v.string(),
    dob: v.number(),
    bedroomNumber: v.string(),
    writtenBy: v.string(),
    dateWritten: v.number(),
    carePlanNumber: v.string(),

    // Care plan details
    identifiedNeeds: v.string(),
    aims: v.string(),

    // Planned care entries
    plannedCareDate: v.array(
      v.object({
        date: v.number(),
        time: v.optional(v.string()),
        details: v.string(),
        signature: v.string()
      })
    ),

    // Review of Patient or Representative
    discussedWith: v.optional(v.string()),
    signature: v.optional(v.string()),
    date: v.number(),
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { assessmentId, ...updateData } = args;

    const assessment = await ctx.db.get(assessmentId);
    if (!assessment) {
      throw new Error("Care plan assessment not found");
    }

    await ctx.db.patch(assessmentId, {
      ...updateData,
      updatedAt: Date.now()
    });

    return assessmentId;
  }
});

/**
 * Create a new version of a care plan, linking to the previous version
 */
export const createNewCarePlanVersion = mutation({
  args: {
    previousCarePlanId: v.id("carePlanAssessments"),

    // Updated care plan details
    identifiedNeeds: v.string(),
    aims: v.string(),

    // Planned care entries
    plannedCareDate: v.array(
      v.object({
        date: v.number(),
        time: v.optional(v.string()),
        details: v.string(),
        signature: v.string()
      })
    ),

    // Metadata
    userId: v.string(),
    writtenBy: v.string()
  },
  returns: v.id("carePlanAssessments"),
  handler: async (ctx, args) => {
    const { previousCarePlanId, ...updateData } = args;

    // Get the previous care plan
    const previousCarePlan = await ctx.db.get(previousCarePlanId);
    if (!previousCarePlan) {
      throw new Error("Previous care plan not found");
    }

    // Cancel the reminder for the previous care plan
    const previousReminders = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_care_plan", (q) => q.eq("carePlanId", previousCarePlanId))
      .collect();

    for (const reminder of previousReminders) {
      if (reminder.reminderStatus === "pending") {
        await ctx.db.patch(reminder._id, {
          reminderStatus: "cancelled" as const
        });
      }
    }

    // Create new care plan with updated data
    const newCarePlanId = await ctx.db.insert("carePlanAssessments", {
      // Copy basic info from previous care plan
      residentId: previousCarePlan.residentId,
      residentName: previousCarePlan.residentName,
      dob: previousCarePlan.dob,
      bedroomNumber: previousCarePlan.bedroomNumber,
      nameOfCarePlan: previousCarePlan.nameOfCarePlan,
      carePlanNumber: previousCarePlan.carePlanNumber,
      folderKey: previousCarePlan.folderKey,

      // Updated info
      userId: updateData.userId,
      writtenBy: updateData.writtenBy,
      dateWritten: Date.now(),
      date: Date.now(),

      // Updated care plan content
      identifiedNeeds: updateData.identifiedNeeds,
      aims: updateData.aims,
      plannedCareDate: updateData.plannedCareDate,

      // Link to previous version
      previousCarePlanId: previousCarePlanId,

      // Metadata
      status: "submitted" as const,
      submittedAt: Date.now()
    });

    // Create reminder 30 days after creation
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    await ctx.db.insert("carePlanReminders", {
      carePlanId: newCarePlanId,
      reminderDate: Date.now() + thirtyDaysInMs,
      reminderStatus: "pending" as const,
      createdBy: updateData.userId,
      createdAt: Date.now()
    });

    // Schedule PDF generation
    await ctx.scheduler.runAfter(
      1000,
      internal.careFiles.carePlan.generatePDFAndUpdateRecord,
      { assessmentId: newCarePlanId }
    );

    return newCarePlanId;
  }
});

/**
 * Create a care plan evaluation
 */
export const createCarePlanEvaluation = mutation({
  args: {
    carePlanId: v.id("carePlanAssessments"),
    evaluationDate: v.number(),
    comments: v.string()
  },
  returns: v.id("carePlanEvaluations"),
  handler: async (ctx, args) => {
    // Verify care plan exists
    const carePlan = await ctx.db.get(args.carePlanId);
    if (!carePlan) {
      throw new Error("Care plan not found");
    }

    // Insert the evaluation
    const evaluationId = await ctx.db.insert("carePlanEvaluations", {
      carePlanId: args.carePlanId,
      evaluationDate: args.evaluationDate,
      comments: args.comments
    });

    return evaluationId;
  }
});

/**
 * Get evaluations for a care plan
 */
export const getCarePlanEvaluations = query({
  args: {
    carePlanId: v.id("carePlanAssessments")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const evaluations = await ctx.db
      .query("carePlanEvaluations")
      .withIndex("by_care_plan", (q) => q.eq("carePlanId", args.carePlanId))
      .order("desc")
      .collect();

    return evaluations;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: { assessmentId: v.id("carePlanAssessments") },
  handler: async (ctx, args) => {
    try {
      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl || !pdfApiUrl.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return;
      }

      if (!pdfApiToken) {
        console.warn(
          "PDF generation disabled: PDF_API_TOKEN not set in environment variables"
        );
        return;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/care-plan`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/care-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pdfApiToken}`
        },
        body: JSON.stringify({ assessmentId: args.assessmentId })
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
      console.log("Received PDF buffer of size:", pdfBuffer.byteLength);

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(new Blob([pdfBuffer]));

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.carePlan.updatePDFFileId, {
        assessmentId: args.assessmentId,
        storageId
      });

      console.log(
        `Successfully generated and stored PDF for care plan assessment ${args.assessmentId}`
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
    }
  }
});

/**
 * Update a care plan assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.storageId
    });
  }
});

/**
 * Get PDF URL for a care plan assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      return null;
    }

    // If we have a stored PDF file, return the file URL
    if (assessment.pdfFileId) {
      return await ctx.storage.getUrl(assessment.pdfFileId);
    }

    // Fallback to direct PDF generation via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/pdf/care-plan?assessmentId=${args.assessmentId}`;
  }
});

/**
 * Cron job to check for care plan reminders
 * Compares dates only (ignoring time)
 */
export const checkCarePlanReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get current date at midnight (start of day)
    const now = new Date();
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    // Get all pending reminders
    const allReminders = await ctx.db.query("carePlanReminders").collect();

    let checkedCount = 0;
    let dueCount = 0;

    for (const reminder of allReminders) {
      if (reminder.reminderStatus === "pending") {
        checkedCount++;

        // Get reminder date at midnight (start of day)
        const reminderDateObj = new Date(reminder.reminderDate);
        const reminderMidnight = new Date(
          reminderDateObj.getFullYear(),
          reminderDateObj.getMonth(),
          reminderDateObj.getDate()
        ).getTime();

        // Check if reminder date (date only) is today or in the past
        if (reminderMidnight <= todayMidnight) {
          dueCount++;
          // TODO: Add notification logic here
          // For example: send email, create notification, etc.
          console.log(
            `Care plan reminder due: ${reminder._id} for care plan ${reminder.carePlanId}`
          );
        }
      }
    }

    console.log(
      `Care plan reminder check complete: ${checkedCount} pending reminders checked, ${dueCount} due today or overdue`
    );

    return null;
  }
});
