import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery
} from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import { components } from "../_generated/api";

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

    // Create reminder - Notification triggers 25 days after care plan creation
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    const reminderDate = Date.now() + twentyFiveDaysInMs;
    
    await ctx.db.insert("carePlanReminders", {
      carePlanId: carePlanId,
      reminderDate: reminderDate, // 25 days after creation
      reminderStatus: "pending" as const,
      createdBy: args.userId,
      createdAt: Date.now(),
      teamId: resident.teamId,
      organizationId: resident.organizationId
    });

    // Note: Notifications will be sent automatically by the cron job after 25 days
    // No immediate notification trigger needed

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

export const getAllCarePlansForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

/**
 * Get only the latest care plan from each folder for a resident
 */
export const getLatestCarePlansForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all care plans for this resident
    const allAssessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Group by folderKey and keep only the latest from each folder
    const latestByFolder = new Map();

    for (const assessment of allAssessments) {
      const folderKey = assessment.folderKey || "default";

      // Only keep the first (latest) assessment for each folder
      if (!latestByFolder.has(folderKey)) {
        latestByFolder.set(folderKey, assessment);
      }
    }

    // Convert map values to array
    return Array.from(latestByFolder.values());
  }
});

/**
 * Get archived (non-latest) care plans for a resident
 */
export const getArchivedCarePlansForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all care plans for this resident
    const allAssessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Group by folderKey
    const groupedByFolder = new Map<string, any[]>();

    for (const assessment of allAssessments) {
      const folderKey = assessment.folderKey || "default";

      if (!groupedByFolder.has(folderKey)) {
        groupedByFolder.set(folderKey, []);
      }
      groupedByFolder.get(folderKey)!.push(assessment);
    }

    // Collect all non-latest care plans (archived)
    const archivedPlans: any[] = [];

    for (const [folderKey, plans] of groupedByFolder.entries()) {
      // Skip the first one (latest) and add the rest to archived
      if (plans.length > 1) {
        archivedPlans.push(...plans.slice(1));
      }
    }

    return archivedPlans;
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

/**
 * Get archived (non-latest) care plans for a resident in a specific folder
 */
export const getArchivedCarePlansByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all care plans for this resident and folder
    const allAssessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderKey", args.folderKey)
      )
      .order("desc")
      .collect();

    // If there's only one or no care plans, there are no archived ones
    if (allAssessments.length <= 1) {
      return [];
    }

    // Return all except the first one (latest) - these are the archived ones
    return allAssessments.slice(1);
  }
});

/**
 * Backfill reminders for existing care plans that don't have reminders
 * This ensures all care plans have notification reminders
 */
/**
 * Public mutation to backfill reminders for existing care plans that don't have reminders
 * This ensures all care plans have notification reminders
 * Can be called from the client to set up reminders for all existing care plans
 */
export const backfillCarePlanReminders = mutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number()
  }),
  handler: async (ctx): Promise<{ created: number; skipped: number }> => {
    // Call the internal mutation to do the actual work
    const result: { created: number; skipped: number } = await ctx.runMutation(internal.careFiles.carePlan.backfillCarePlanRemindersInternal, {});
    return result;
  }
});

/**
 * Internal mutation to backfill reminders for existing care plans that don't have reminders
 * This ensures all care plans have notification reminders
 */
export const backfillCarePlanRemindersInternal = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number()
  }),
  handler: async (ctx) => {
    console.log(`[backfillCarePlanReminders] Starting backfill for all care plans`);
    
    // Get all care plans
    const allCarePlans = await ctx.db
      .query("carePlanAssessments")
      .collect();

    console.log(`[backfillCarePlanReminders] Found ${allCarePlans.length} total care plans`);

    let created = 0;
    let skipped = 0;

    for (const carePlan of allCarePlans) {
      // Check if reminder already exists
      const existingReminder = await ctx.db
        .query("carePlanReminders")
        .withIndex("by_care_plan", (q) => q.eq("carePlanId", carePlan._id))
        .first();

      if (existingReminder) {
        // Update existing reminder with teamId and organizationId if missing
        if (!existingReminder.teamId || !existingReminder.organizationId) {
          const resident = await ctx.db.get(carePlan.residentId);
          if (resident) {
            await ctx.db.patch(existingReminder._id, {
              teamId: resident.teamId,
              organizationId: resident.organizationId
            });
            console.log(`[backfillCarePlanReminders] Updated reminder ${existingReminder._id} with teamId and organizationId`);
          }
        }
        skipped++;
        continue;
      }

      // Check if evaluation already exists - if so, skip creating reminder
      const existingEvaluation = await ctx.db
        .query("carePlanEvaluations")
        .withIndex("by_care_plan", (q) => q.eq("carePlanId", carePlan._id))
        .first();

      if (existingEvaluation) {
        console.log(`[backfillCarePlanReminders] Skipping care plan ${carePlan._id} - evaluation already exists`);
        skipped++;
        continue;
      }

      // Get resident to get teamId and organizationId
      const resident = await ctx.db.get(carePlan.residentId);
      if (!resident) {
        console.warn(`[backfillCarePlanReminders] Resident not found for care plan ${carePlan._id}`);
        skipped++;
        continue;
      }

      // Create reminder for this care plan
      // Notification triggers 25 days after care plan creation
      // IMPORTANT: Only create reminders for care plans that haven't reached their 25-day mark yet
      const carePlanCreationDate = carePlan.submittedAt || carePlan._creationTime;
      const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      
      // Calculate reminder date (25 days after creation)
      let reminderDate: number;
      if (carePlanCreationDate) {
        const calculatedReminderDate = carePlanCreationDate + twentyFiveDaysInMs;
        const overdueDate = carePlanCreationDate + thirtyDaysInMs;
        
        // If care plan is already overdue (past 30 days), don't create reminder
        if (Date.now() > overdueDate) {
          console.log(`[backfillCarePlanReminders] Skipping care plan ${carePlan._id} - already overdue (created ${Math.floor((Date.now() - carePlanCreationDate) / (24 * 60 * 60 * 1000))} days ago)`);
          skipped++;
          continue;
        }
        
        // If the 25-day reminder date has already passed, skip creating reminder
        // Notifications should ONLY trigger at the 25-day mark, not for old care plans
        if (calculatedReminderDate < Date.now()) {
          console.log(`[backfillCarePlanReminders] Skipping care plan ${carePlan._id} - 25-day reminder date has already passed (created ${Math.floor((Date.now() - carePlanCreationDate) / (24 * 60 * 60 * 1000))} days ago)`);
          skipped++;
          continue;
        }
        
        // Reminder date is in the future, use it
        reminderDate = calculatedReminderDate;
      } else {
        // If no creation date, use now + 25 days
        reminderDate = Date.now() + twentyFiveDaysInMs;
      }

      await ctx.db.insert("carePlanReminders", {
        carePlanId: carePlan._id,
        reminderDate: reminderDate,
        reminderStatus: "pending" as const,
        createdBy: carePlan.userId || "system",
        createdAt: Date.now(),
        teamId: resident.teamId,
        organizationId: resident.organizationId
      });

      console.log(`[backfillCarePlanReminders] ✅ Created reminder for care plan ${carePlan._id} (resident: ${resident.firstName} ${resident.lastName}, team: ${resident.teamId})`);
      created++;
    }

    console.log(`[backfillCarePlanReminders] Backfill complete: ${created} reminders created, ${skipped} skipped`);

    // Note: Notifications will be sent automatically by the cron job when reminderDate is reached
    // No immediate notification trigger needed

    return { created, skipped };
  }
});

/**
 * Fix existing reminders that have immediate dates (for testing)
 * This updates reminders to have the correct 25-day reminder date
 * Only fixes reminders where the 25-day date hasn't passed yet
 */
export const fixImmediateReminders = mutation({
  args: {},
  returns: v.object({
    fixed: v.number(),
    skipped: v.number()
  }),
  handler: async (ctx) => {
    console.log(`[fixImmediateReminders] Starting to fix immediate reminders`);
    
    // Get all pending reminders
    const allReminders = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_reminder_status", (q) =>
        q.eq("reminderStatus", "pending")
      )
      .collect();

    console.log(`[fixImmediateReminders] Found ${allReminders.length} pending reminders`);

    let fixed = 0;
    let skipped = 0;
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const reminder of allReminders) {
      // Get care plan to find creation date
      const carePlan = await ctx.db.get(reminder.carePlanId);
      if (!carePlan) {
        console.warn(`[fixImmediateReminders] Care plan not found for reminder ${reminder._id}`);
        skipped++;
        continue;
      }

      const carePlanCreationDate = carePlan.submittedAt || carePlan._creationTime || reminder.createdAt;
      const correctReminderDate = carePlanCreationDate + twentyFiveDaysInMs;

      // Check if reminder date is set incorrectly (not at the 25-day mark)
      // A reminder is "immediate" if it's within the last 7 days (likely from testing)
      const reminderDateAge = now - reminder.reminderDate;
      const isLikelyImmediate = reminderDateAge >= 0 && reminderDateAge < 7 * 24 * 60 * 60 * 1000; // Within last 7 days
      const isIncorrect = Math.abs(reminder.reminderDate - correctReminderDate) > 60 * 60 * 1000; // More than 1 hour difference

      // Only fix if reminder date is incorrect AND the correct date hasn't passed yet
      if ((isLikelyImmediate || isIncorrect) && correctReminderDate > now) {
        await ctx.db.patch(reminder._id, {
          reminderDate: correctReminderDate
        });
        console.log(`[fixImmediateReminders] ✅ Fixed reminder ${reminder._id}: ${new Date(reminder.reminderDate).toISOString()} -> ${new Date(correctReminderDate).toISOString()}`);
        fixed++;
      } else if (correctReminderDate <= now) {
        // If correct reminder date has already passed, mark as completed (notification should have been sent)
        await ctx.db.patch(reminder._id, {
          reminderStatus: "completed" as const,
          completedAt: now
        });
        console.log(`[fixImmediateReminders] Marked reminder ${reminder._id} as completed (25-day date has passed)`);
        skipped++;
      } else {
        skipped++;
      }
    }

    console.log(`[fixImmediateReminders] Complete: ${fixed} reminders fixed, ${skipped} skipped`);
    return { fixed, skipped };
  }
});

/**
 * Get pending care plan reminders for a specific team
 * Used to create notifications for nurses when they switch to a unit
 */
export const getPendingRemindersForTeam = internalQuery({
  args: {
    teamId: v.string(),
    organizationId: v.string()
  },
  returns: v.array(v.object({
    _id: v.id("carePlanReminders"),
    carePlanId: v.id("carePlanAssessments"),
    reminderDate: v.number(),
    reminderStatus: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    teamId: v.optional(v.string()),
    organizationId: v.optional(v.string())
  })),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get all pending reminders for this team
    const reminders = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_reminder_status", (q) => q.eq("reminderStatus", "pending"))
      .filter((q) => {
        // Filter by teamId and organizationId, and reminderDate <= now
        return q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.eq(q.field("organizationId"), args.organizationId),
          q.lte(q.field("reminderDate"), now)
        );
      })
      .collect();

    // Also check for reminders where teamId matches but might be missing organizationId
    const remindersByTeam = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_reminder_status", (q) => q.eq("reminderStatus", "pending"))
      .filter((q) => {
        return q.and(
          q.eq(q.field("teamId"), args.teamId),
          q.lte(q.field("reminderDate"), now)
        );
      })
      .collect();

    // Merge and deduplicate
    const allReminders = [...reminders];
    const reminderIds = new Set(reminders.map(r => r._id));
    
    for (const reminder of remindersByTeam) {
      if (!reminderIds.has(reminder._id)) {
        allReminders.push(reminder);
        reminderIds.add(reminder._id);
      }
    }

    // Filter out reminders where evaluation already exists
    const validReminders: Array<Doc<"carePlanReminders">> = [];
    for (const reminder of allReminders) {
      const existingEvaluation = await ctx.db
        .query("carePlanEvaluations")
        .withIndex("by_care_plan", (q) => q.eq("carePlanId", reminder.carePlanId))
        .first();

      if (!existingEvaluation) {
        validReminders.push(reminder);
      }
    }

    return validReminders;
  }
});

/**
 * Get care plan details for notification creation
 */
export const getCarePlanForNotification = internalQuery({
  args: {
    carePlanId: v.id("carePlanAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("carePlanAssessments"),
      residentId: v.id("residents"),
      nameOfCarePlan: v.string(),
      folderKey: v.optional(v.string()),
      submittedAt: v.optional(v.number()),
      _creationTime: v.number(),
      resident: v.object({
        _id: v.id("residents"),
        firstName: v.string(),
        lastName: v.string()
      })
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const carePlan = await ctx.db.get(args.carePlanId);
    if (!carePlan) {
      return null;
    }

    const resident = await ctx.db.get(carePlan.residentId);
    if (!resident) {
      return null;
    }

    return {
      _id: carePlan._id,
      residentId: carePlan.residentId,
      nameOfCarePlan: carePlan.nameOfCarePlan,
      folderKey: carePlan.folderKey,
      submittedAt: carePlan.submittedAt,
      _creationTime: carePlan._creationTime,
      resident: {
        _id: resident._id,
        firstName: resident.firstName,
        lastName: resident.lastName
      }
    };
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

    // Get resident to access teamId and organizationId
    const resident = await ctx.db.get(previousCarePlan.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Create reminder - Notification triggers 25 days after care plan update
    const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
    const reminderDate = Date.now() + twentyFiveDaysInMs;
    
    await ctx.db.insert("carePlanReminders", {
      carePlanId: newCarePlanId,
      reminderDate: reminderDate, // 25 days after update
      reminderStatus: "pending" as const,
      createdBy: updateData.userId,
      createdAt: Date.now(),
      teamId: resident.teamId,
      organizationId: resident.organizationId
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

// Delete a care plan assessment
export const deleteCarePlanAssessment = mutation({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    // Delete the care plan assessment
    await ctx.db.delete(args.assessmentId);

    // Optionally delete associated evaluations
    const evaluations = await ctx.db
      .query("carePlanEvaluations")
      .withIndex("by_care_plan", (q) => q.eq("carePlanId", args.assessmentId))
      .collect();

    for (const evaluation of evaluations) {
      await ctx.db.delete(evaluation._id);
    }

    // Optionally delete associated reminders
    const reminders = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_care_plan", (q) => q.eq("carePlanId", args.assessmentId))
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    return { success: true };
  }
});

/**
 * Get all nurses in a team by role
 * Uses Better Auth member records as source of truth for role and team membership
 * Ensures nurses get notifications for residents in their current team regardless of onboarding team
 */
export const getNursesInTeam = internalQuery({
  args: {
    teamId: v.string(),
    organizationId: v.string() // Need organizationId to query Better Auth members
  },
  returns: v.array(v.object({
    email: v.string(),
    userId: v.string()
  })),
  handler: async (ctx, args) => {
    console.log(`[getNursesInTeam] ========== START: Getting nurses for team ${args.teamId} in org ${args.organizationId} ==========`);
    console.log(`[getNursesInTeam] Input params:`, {
      teamId: args.teamId,
      teamIdType: typeof args.teamId,
      organizationId: args.organizationId,
      organizationIdType: typeof args.organizationId
    });

    // Strategy: Use Better Auth member records as source of truth
    // 1. Get all Better Auth members in the organization with role "nurse"
    // 2. For each nurse, check if they belong to the requested team via:
    //    - teamMembers entry for this teamId, OR
    //    - activeTeamId matching this teamId
    // This ensures nurses get notifications regardless of where they onboarded

    console.log(`[getNursesInTeam] Step 1: Getting all Better Auth members in organization ${args.organizationId}`);
    
    // Get all Better Auth members in the organization
    let allMembers;
    try {
      const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "member",
        where: [{ field: "organizationId", value: args.organizationId }],
        paginationOpts: { cursor: null, numItems: 1000 } // Get all members
      });
      allMembers = membersResult?.page || [];
      console.log(`[getNursesInTeam] Step 1: Found ${allMembers.length} total members in organization`);
    } catch (error) {
      console.error(`[getNursesInTeam] Step 1 ERROR: Failed to get Better Auth members:`, error);
      allMembers = [];
    }

    // Filter to only nurses
    const nurseMembers = allMembers.filter((m: { role?: string }) => m.role === "nurse");
    console.log(`[getNursesInTeam] Step 2: Found ${nurseMembers.length} nurses in organization (filtered by role)`);
    
    if (nurseMembers.length === 0) {
      console.log(`[getNursesInTeam] No nurses found in organization, returning empty array`);
      return [];
    }

    // Get teamMembers entries for this team
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    console.log(`[getNursesInTeam] Step 3: Found ${teamMembers.length} teamMembers entries for team ${args.teamId}`);

    // Get users with activeTeamId matching this team
    const usersWithActiveTeam = await ctx.db
      .query("users")
      .withIndex("byActiveTeamId", (q) => q.eq("activeTeamId", args.teamId))
      .collect();
    console.log(`[getNursesInTeam] Step 4: Found ${usersWithActiveTeam.length} users with activeTeamId = ${args.teamId}`);

    const nurses: Array<{ email: string; userId: string }> = [];
    const addedUserEmails = new Set<string>(); // Prevent duplicates
    const requestedTeamIdStr = String(args.teamId);

    console.log(`[getNursesInTeam] Step 5: Processing ${nurseMembers.length} nurses to check team membership`);

    // Process each nurse member from Better Auth
    for (const nurseMember of nurseMembers) {
      const betterAuthUserId = nurseMember.userId;
      console.log(`[getNursesInTeam] Processing nurse member:`, {
        userId: betterAuthUserId,
        role: nurseMember.role,
        organizationId: nurseMember.organizationId
      });

      // Get Better Auth user to get email
      let authUser: { email?: string; [key: string]: unknown } | null = null;
      try {
        authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: betterAuthUserId }]
        }) as { email?: string; [key: string]: unknown } | null;
        if (authUser) {
          console.log(`[getNursesInTeam] ✓ Found Better Auth user: ${authUser.email}`);
        }
      } catch (error) {
        console.warn(`[getNursesInTeam] Failed to get Better Auth user for userId ${betterAuthUserId}:`, error);
        continue;
      }

      if (!authUser || !authUser.email) {
        console.warn(`[getNursesInTeam] No email found for nurse member userId ${betterAuthUserId}`);
        continue;
      }

      // Extract email to properly narrow the type
      const userEmail = authUser.email;

      // Skip if already processed
      if (addedUserEmails.has(userEmail)) {
        console.log(`[getNursesInTeam] Skipping duplicate: ${userEmail}`);
        continue;
      }

      // Get local user record (userEmail is safe after earlier guard)
      const localUser = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", userEmail))
        .first();

      if (!localUser) {
        console.warn(`[getNursesInTeam] Local user not found for email ${userEmail}`);
        continue;
      }

      // Check if this nurse belongs to the requested team
      // Method 1: Check teamMembers entry for this team
      const teamMemberForThisTeam = teamMembers.find(tm => 
        tm.userId === betterAuthUserId || tm.email === userEmail
      );

      // Method 2: Check activeTeamId
      const userActiveTeamIdStr = localUser.activeTeamId != null ? String(localUser.activeTeamId) : null;
      const hasActiveTeamMatch = userActiveTeamIdStr === requestedTeamIdStr;

      console.log(`[getNursesInTeam] Team membership check for ${userEmail}:`, {
        hasTeamMemberEntry: !!teamMemberForThisTeam,
        teamMemberTeamId: teamMemberForThisTeam?.teamId,
        activeTeamId: localUser.activeTeamId,
        activeTeamIdStr: userActiveTeamIdStr,
        requestedTeamIdStr: requestedTeamIdStr,
        hasActiveTeamMatch: hasActiveTeamMatch
      });

      // Include if they have a teamMembers entry for this team OR activeTeamId matches
      if (!teamMemberForThisTeam && !hasActiveTeamMatch) {
        console.log(`[getNursesInTeam] ❌ Excluding nurse ${userEmail} - not in team ${args.teamId}`);
        console.log(`[getNursesInTeam]   - No teamMembers entry for this team`);
        console.log(`[getNursesInTeam]   - activeTeamId (${userActiveTeamIdStr}) != requested (${requestedTeamIdStr})`);
        continue;
      }

      // Check onboarding status
      const isOnboardingComplete = localUser.isOnboardingComplete;
      if (isOnboardingComplete !== true) {
        console.log(`[getNursesInTeam] Excluding ${userEmail} - onboarding not complete`);
        continue;
      }

      console.log(`[getNursesInTeam] ✅ Including nurse: ${userEmail}`, {
        userId: betterAuthUserId,
        role: nurseMember.role,
        teamMembershipMethod: teamMemberForThisTeam ? 'teamMembers entry' : 'activeTeamId',
        activeTeamId: localUser.activeTeamId
      });

      addedUserEmails.add(userEmail);
      nurses.push({
        email: userEmail,
        userId: betterAuthUserId
      });
    }

    console.log(`[getNursesInTeam] ========== END: Returning ${nurses.length} nurses for team ${args.teamId} ==========`);
    console.log(`[getNursesInTeam] Final nurse list:`, nurses.map(n => ({ email: n.email, userId: n.userId })));

    return nurses;
  }
});

/**
 * Send care plan evaluation notifications to nurses
 * Runs every 2 minutes to send reminders
 * Starts immediately after care plan creation/update
 */
export const sendCarePlanEvaluationNotifications = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000; // 2 minutes in milliseconds

    console.log(`[CarePlanNotifications] Starting notification check at ${new Date(now).toISOString()}`);

    // Get all pending reminders
    const allPendingReminders = await ctx.db
      .query("carePlanReminders")
      .withIndex("by_reminder_status", (q) =>
        q.eq("reminderStatus", "pending")
      )
      .collect();

    console.log(`[CarePlanNotifications] Found ${allPendingReminders.length} total pending reminders`);

    // Filter to only those where reminderDate has been reached
    const pendingReminders = allPendingReminders.filter(
      (r) => r.reminderDate <= now
    );

    console.log(`[CarePlanNotifications] Found ${pendingReminders.length} pending reminders with reminderDate <= now`);

    for (const reminder of pendingReminders) {
      // Skip if reminder date hasn't been reached yet
      if (reminder.reminderDate > now) {
        console.log(`[CarePlanNotifications] Skipping reminder ${reminder._id} - reminderDate ${new Date(reminder.reminderDate).toISOString()} is in the future`);
        continue;
      }

      // Skip if notification was sent less than 2 minutes ago (prevent duplicates)
      if (reminder.lastNotificationSentAt && reminder.lastNotificationSentAt > twoMinutesAgo) {
        console.log(`[CarePlanNotifications] Skipping reminder ${reminder._id} - notification sent recently at ${new Date(reminder.lastNotificationSentAt).toISOString()}`);
        continue;
      }

      console.log(`[CarePlanNotifications] Processing reminder ${reminder._id} for care plan ${reminder.carePlanId}`);

      // Get care plan
      const carePlan = await ctx.db.get(reminder.carePlanId);
      if (!carePlan) {
        console.warn(`Care plan not found for reminder ${reminder._id}`);
        continue;
      }

      // Automatically fix reminder date if it's incorrect (e.g., set to immediate for testing)
      const carePlanCreationDate = carePlan.submittedAt || carePlan._creationTime || reminder.createdAt;
      const twentyFiveDaysInMs = 25 * 24 * 60 * 60 * 1000;
      const correctReminderDate = carePlanCreationDate + twentyFiveDaysInMs;
      
      // Check if reminder date is incorrect (not at the 25-day mark)
      // A reminder is likely "immediate" if it's within the last 7 days (from testing)
      const reminderDateAge = now - reminder.reminderDate;
      const isLikelyImmediate = reminderDateAge >= 0 && reminderDateAge < 7 * 24 * 60 * 60 * 1000; // Within last 7 days
      const isIncorrect = Math.abs(reminder.reminderDate - correctReminderDate) > 60 * 60 * 1000; // More than 1 hour difference
      
      // If reminder date is incorrect and the correct date hasn't passed yet, fix it
      if ((isLikelyImmediate || isIncorrect) && correctReminderDate > now) {
        console.log(`[CarePlanNotifications] 🔧 Auto-fixing incorrect reminder date for reminder ${reminder._id}`);
        console.log(`[CarePlanNotifications]   Old date: ${new Date(reminder.reminderDate).toISOString()}`);
        console.log(`[CarePlanNotifications]   New date: ${new Date(correctReminderDate).toISOString()}`);
        await ctx.db.patch(reminder._id, {
          reminderDate: correctReminderDate
        });
        // Skip this reminder for now - it will be processed in the next cron run
        continue;
      } else if (correctReminderDate <= now && (isLikelyImmediate || isIncorrect)) {
        // If correct reminder date has already passed but reminder has wrong date, mark as completed
        console.log(`[CarePlanNotifications] Marking reminder ${reminder._id} as completed (25-day date has passed)`);
        await ctx.db.patch(reminder._id, {
          reminderStatus: "completed" as const,
          completedAt: now
        });
        continue;
      }

      // Get resident to access teamId and organizationId
      const resident = await ctx.db.get(carePlan.residentId);
      if (!resident) {
        console.warn(`Resident not found for care plan ${reminder.carePlanId}`);
        continue;
      }

      // Use teamId from reminder if available, otherwise from resident
      // Ensure teamId is a string for consistent comparison
      let teamId: string | undefined = reminder.teamId || resident.teamId;
      if (teamId != null) {
        teamId = String(teamId);
      }
      let organizationId: string | undefined = reminder.organizationId || resident.organizationId;
      if (organizationId != null) {
        organizationId = String(organizationId);
      }

      // Update reminder with teamId/organizationId if missing (for old reminders)
      if (!reminder.teamId || !reminder.organizationId) {
        await ctx.db.patch(reminder._id, {
          teamId: teamId,
          organizationId: organizationId
        });
      }

      if (!teamId || !organizationId) {
        console.warn(`[CarePlanNotifications] Missing teamId or organizationId for reminder ${reminder._id}`, {
          reminderTeamId: reminder.teamId,
          residentTeamId: resident.teamId,
          reminderOrgId: reminder.organizationId,
          residentOrgId: resident.organizationId
        });
        continue;
      }

      // Log team information for debugging
      console.log(`[CarePlanNotifications] ========== Processing reminder ${reminder._id} ==========`);
      console.log(`[CarePlanNotifications] Team: ${teamId}, Organization: ${organizationId}`);
      console.log(`[CarePlanNotifications] Resident: ${resident.firstName} ${resident.lastName} (ID: ${resident._id})`);
      console.log(`[CarePlanNotifications] Care Plan: ${carePlan.nameOfCarePlan} (ID: ${carePlan._id})`);

      // Check if evaluation already exists
      const existingEvaluation = await ctx.db
        .query("carePlanEvaluations")
        .withIndex("by_care_plan", (q) => q.eq("carePlanId", reminder.carePlanId))
        .first();

      if (existingEvaluation) {
        // Evaluation exists, mark reminder as completed
        await ctx.db.patch(reminder._id, {
          reminderStatus: "completed" as const,
          completedAt: now
        });
        continue;
      }

      // Calculate days until overdue (30 days after care plan creation)
      // Notification is sent at 25 days, so there are 5 days remaining when notification is triggered
      // Note: carePlanCreationDate is already declared above, reusing it here
      const overdueDate = carePlanCreationDate + (30 * 24 * 60 * 60 * 1000); // 30 days after care plan creation
      const daysRemaining = Math.ceil((overdueDate - now) / (24 * 60 * 60 * 1000));
      
      // Ensure days remaining is at least 0 (should be 5 when notification is first sent at 25 days)
      const displayDaysRemaining = Math.max(0, daysRemaining);

      // If overdue, mark as completed and stop
      if (daysRemaining <= 0) {
        await ctx.db.patch(reminder._id, {
          reminderStatus: "completed" as const,
          completedAt: now
        });
        continue;
      }

      // Get folder name from folderKey
      let folderName = carePlan.folderKey || "Default";
      if (carePlan.folderKey) {
        // Try to get folder name from folders table
        // First try by name (folderKey might be the folder name)
        try {
          const folderByName = await ctx.db
            .query("folders")
            .withIndex("byResidentId", (q) => q.eq("residentId", resident._id))
            .filter((q) => q.eq(q.field("name"), carePlan.folderKey))
            .first();
          
          if (folderByName) {
            folderName = folderByName.name;
            console.log(`[CarePlanNotifications] Found folder by name: ${folderName} for folderKey: ${carePlan.folderKey}`);
          } else {
            // Try by ID (folderKey might be a folder ID)
            try {
              const folderById = await ctx.db.get(carePlan.folderKey as Id<"folders">);
              if (folderById && folderById.residentId === resident._id) {
                folderName = folderById.name;
                console.log(`[CarePlanNotifications] Found folder by ID: ${folderName} for folderKey: ${carePlan.folderKey}`);
              } else {
                // If not found, assume folderKey is the folder name itself
                folderName = carePlan.folderKey;
                console.log(`[CarePlanNotifications] Using folderKey as folder name: ${folderName}`);
              }
            } catch (idError) {
              // If ID lookup fails, use folderKey as folder name
              folderName = carePlan.folderKey;
              console.log(`[CarePlanNotifications] Using folderKey as folder name (ID lookup failed): ${folderName}`);
            }
          }
        } catch (error) {
          // If query fails, use folderKey as folder name
          folderName = carePlan.folderKey;
          console.warn(`[CarePlanNotifications] Error getting folder name, using folderKey: ${folderName}`, error);
        }
      }

      // Get resident name
      const residentName = `${resident.firstName} ${resident.lastName}`;
      
      // Get care plan name
      const carePlanName = carePlan.nameOfCarePlan || "Care Plan";

      // Get all nurses in the team
      console.log(`[CarePlanNotifications] Calling getNursesInTeam with teamId: ${teamId}, organizationId: ${organizationId}`);
      let nurses: Array<{ email: string; userId: string }> = [];
      try {
        nurses = await ctx.runQuery(internal.careFiles.carePlan.getNursesInTeam, {
          teamId: teamId,
          organizationId: organizationId
        });
        console.log(`[CarePlanNotifications] ✅ getNursesInTeam returned ${nurses.length} nurses for team ${teamId}`);
      } catch (error) {
        console.error(`[CarePlanNotifications] ❌ Error calling getNursesInTeam for team ${teamId}:`, error);
        if (error instanceof Error) {
          console.error(`[CarePlanNotifications] Error message: ${error.message}`);
          console.error(`[CarePlanNotifications] Error stack: ${error.stack}`);
        }
        continue; // Skip this reminder if we can't get nurses
      }

      if (nurses.length > 0) {
        console.log(`[CarePlanNotifications] Nurse emails: ${nurses.map((n: { email: string; userId: string }) => n.email).join(', ')}`);
      } else {
        console.warn(`[CarePlanNotifications] ⚠️ No nurses found in team ${teamId} for reminder ${reminder._id}`);
        console.warn(`[CarePlanNotifications] This might mean:`);
        console.warn(`[CarePlanNotifications]   - No nurses are assigned to this team`);
        console.warn(`[CarePlanNotifications]   - Nurses haven't switched to this team yet`);
        console.warn(`[CarePlanNotifications]   - Team ID mismatch: ${teamId}`);
        continue;
      }

      // Create notifications for each nurse
      // IMPORTANT: Check if notification already exists to prevent duplicates
      // This ensures nurses who switch teams get notifications for existing care plans
      let notificationCount = 0;
      for (const nurse of nurses) {
        try {
          // Check if notification already exists for this nurse and care plan
          // Query all notifications for this user and filter in memory (metadata is nested)
          const userNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", nurse.email))
            .collect();

          const existingNotification = userNotifications.find(n => 
            n.type === "care_plan_evaluation" &&
            n.teamId === teamId &&
            n.metadata &&
            typeof n.metadata === "object" &&
            "carePlanId" in n.metadata &&
            n.metadata.carePlanId === reminder.carePlanId
          );

          if (existingNotification) {
            console.log(`[CarePlanNotifications] Notification already exists for nurse ${nurse.email} and care plan ${reminder.carePlanId}, skipping`);
            continue;
          }

          console.log(`[CarePlanNotifications] Creating notification for nurse ${nurse.email} with userId: ${nurse.email}`);
          
          // Create notification with new format:
          // "{Care folder name}:{Care Plan Name} evaluation not completed.
          // An evaluation is required and is still pending.
          // 
          // 5 days remaining to complete the evaluation.
          // This is the final notification."
          const notificationTitle = `${folderName}:${carePlanName} evaluation not completed.`;
          const notificationMessage = `An evaluation is required and is still pending.\n\n${displayDaysRemaining} day${displayDaysRemaining !== 1 ? "s" : ""} remaining to complete the evaluation.\nThis is the final notification.`;
          
          const notificationId = await ctx.runMutation(api.notifications.createNotification, {
            userId: nurse.email,
            type: "care_plan_evaluation",
            title: notificationTitle,
            message: notificationMessage,
            link: `/dashboard/residents/${resident._id}/care-file`,
            metadata: {
              carePlanId: reminder.carePlanId,
              residentId: resident._id,
              residentName: residentName,
              folderKey: carePlan.folderKey,
              folderName: folderName,
              carePlanName: carePlanName,
              daysRemaining: displayDaysRemaining
            },
            organizationId: organizationId,
            teamId: teamId
          });
          
          console.log(`[CarePlanNotifications] ✅ Successfully created notification ${notificationId} for nurse ${nurse.email}`);
          notificationCount++;
        } catch (error) {
          console.error(`[CarePlanNotifications] ❌ Failed to create notification for nurse ${nurse.email}:`, error);
          // Log the full error details
          if (error instanceof Error) {
            console.error(`[CarePlanNotifications] Error message: ${error.message}`);
            console.error(`[CarePlanNotifications] Error stack: ${error.stack}`);
          }
        }
      }

      console.log(`[CarePlanNotifications] Created ${notificationCount} notifications for reminder ${reminder._id}`);
      console.log(`[CarePlanNotifications] ========== COMPLETED reminder ${reminder._id} ==========`);

      // Update reminder with last notification sent time
      await ctx.db.patch(reminder._id, {
        lastNotificationSentAt: now
      });
    }

    console.log(`[CarePlanNotifications] ========== NOTIFICATION CHECK COMPLETE ==========`);
    console.log(`[CarePlanNotifications] Processed ${pendingReminders.length} reminders`);
    return null;
  }
});
