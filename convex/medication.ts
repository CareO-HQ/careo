import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Helper function to create medication intake records for up to 7 days or until end date
async function createMedicationIntakes(
  ctx: any,
  medicationId: Id<"medication">,
  medication: {
    name: string;
    frequency: string;
    times: string[];
    startDate: number;
    endDate?: number;
    scheduleType: string;
    residentId: Id<"residents">;
  },
  organizationId: string,
  teamId: string
) {
  // Only create intakes for scheduled medications, not PRN
  if (medication.scheduleType === "PRN (As Needed)") {
    console.log(
      `Medication "${medication.name}" is PRN (As Needed) - no scheduled intakes created`
    );
    return;
  }

  // Create date object and ensure we're working with the correct date
  // Handle timezone issues by reconstructing the date from the original timestamp
  const originalStartDate = new Date(medication.startDate);
  console.log(
    `Original start date from timestamp: ${originalStartDate.toISOString()}`
  );
  console.log(
    `Original start date local: ${originalStartDate.toLocaleDateString()}`
  );

  // Create a new date using the local date components to avoid timezone shifts
  const startDate = new Date(
    originalStartDate.getFullYear(),
    originalStartDate.getMonth(),
    originalStartDate.getDate(),
    12, // Set to noon to be safe
    0,
    0,
    0
  );

  console.log(`Corrected start date: ${startDate.toLocaleDateString()}`);
  const medicationTimes = medication.times;

  console.log(
    `Creating medication intake records for "${medication.name}" (${medication.frequency})`
  );
  console.log(`Start date: ${startDate.toLocaleDateString()}`);
  console.log(`Times per day: ${medicationTimes.join(", ")}`);

  // Calculate how many days to increment based on frequency
  let dayIncrement = 1;
  if (medication.frequency === "Weekly") {
    dayIncrement = 7;
  } else if (medication.frequency === "Monthly") {
    dayIncrement = 30;
  }

  const intakeRecords = [];

  // Determine the end date for creating intakes
  const endDate = medication.endDate ? new Date(medication.endDate) : null;

  if (endDate) {
    console.log(`Original end date from timestamp: ${endDate.toISOString()}`);
    console.log(`Original end date local: ${endDate.toLocaleDateString()}`);
  }
  const maxDate = endDate
    ? new Date(
        Math.min(
          endDate.getTime(),
          startDate.getTime() + 7 * 24 * 60 * 60 * 1000
        )
      ) // 7 days from start
    : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

  console.log(
    `Creating intakes until: ${endDate ? endDate.toLocaleDateString() : "7 days from start"}`
  );

  // Generate intake records until end date or 7 days, whichever comes first
  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day * dayIncrement);

    // Skip if this frequency doesn't apply to this day
    if (medication.frequency === "Weekly" && day > 0) break;
    if (medication.frequency === "Monthly" && day > 0) break;
    if (medication.frequency === "One time (STAT)" && day > 0) break;

    // Create intake record for each scheduled time on this day
    for (const time of medicationTimes) {
      const [hours, minutes] = time.split(":");
      const scheduledDateTime = new Date(currentDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create date in local timezone, then adjust for UTC storage
      // This ensures the stored time represents the intended local time
      const correctScheduledDateTime = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        parseInt(hours),
        parseInt(minutes),
        0,
        0
      );

      // If you want to store as "intended local time" regardless of timezone:
      // Uncomment the next 3 lines to offset the timezone difference
      // const timezoneOffset = correctScheduledDateTime.getTimezoneOffset() * 60000;
      // const localTimeAsUTC = new Date(correctScheduledDateTime.getTime() + timezoneOffset);
      // correctScheduledDateTime = localTimeAsUTC;

      console.log(
        `Creating intake for: ${correctScheduledDateTime.toLocaleDateString()} at ${correctScheduledDateTime.toLocaleTimeString(
          "en-GB",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }
        )} (Local time)`
      );
      console.log(`UTC time: ${correctScheduledDateTime.toISOString()}`);
      console.log(
        `Timestamp being saved: ${correctScheduledDateTime.getTime()}`
      );

      const intakeRecord = {
        medicationId,
        residentId: medication.residentId,
        scheduledTime: correctScheduledDateTime.getTime(),
        state: "scheduled" as const,
        teamId,
        organizationId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const intakeId = await ctx.db.insert("medicationIntake", intakeRecord);
      intakeRecords.push(intakeId);
    }

    // Check if we've reached the end date AFTER creating intakes for this day
    if (endDate && currentDate >= endDate) {
      console.log(
        `Reached end date after creating intakes for: ${currentDate.toLocaleDateString()}`
      );
      break;
    }
  }

  console.log(
    `Created ${intakeRecords.length} medication intake records for "${medication.name}"`
  );
  return intakeRecords;
}

export const createMedication = mutation({
  args: {
    residentId: v.id("residents"),
    medication: v.object({
      name: v.string(),
      strength: v.string(),
      strengthUnit: v.union(v.literal("mg"), v.literal("g")),
      totalCount: v.number(),
      dosageForm: v.union(
        v.literal("Tablet"),
        v.literal("Capsule"),
        v.literal("Liquid"),
        v.literal("Injection"),
        v.literal("Cream"),
        v.literal("Ointment"),
        v.literal("Patch"),
        v.literal("Inhaler")
      ),
      route: v.union(
        v.literal("Oral"),
        v.literal("Topical"),
        v.literal("Intramuscular (IM)"),
        v.literal("Intravenous (IV)"),
        v.literal("Subcutaneous"),
        v.literal("Inhalation"),
        v.literal("Rectal"),
        v.literal("Sublingual")
      ),
      frequency: v.union(
        v.literal("Once daily (OD)"),
        v.literal("Twice daily (BD)"),
        v.literal("Three times daily (TD)"),
        v.literal("Four times daily (QDS)"),
        v.literal("Four times daily (QIS)"),
        v.literal("As Needed (PRN)"),
        v.literal("One time (STAT)"),
        v.literal("Weekly"),
        v.literal("Monthly")
      ),
      scheduleType: v.union(
        v.literal("Scheduled"),
        v.literal("PRN (As Needed)")
      ),
      times: v.array(v.string()),
      instructions: v.optional(v.string()),
      prescriberName: v.string(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    })
  },
  returns: v.id("medication"),
  handler: async (ctx, args) => {
    const { medication, residentId } = args;

    // Get current session for organization and authentication
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.token) {
      throw new Error("Not authenticated");
    }

    // Get current user information
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("User not found");
    }

    // Get current organization from session
    const currentOrganizationId = session.activeOrganizationId;
    if (!currentOrganizationId) {
      throw new Error("No active organization found");
    }

    // Get current user's active team
    const userData = await ctx.db.get(userMetadata.userId as Id<"users">);
    const currentTeamId = userData?.activeTeamId;
    if (!currentTeamId) {
      throw new Error("No active team found");
    }

    const medicationData = {
      ...medication,
      residentId: residentId,
      createdByUserId: userMetadata.userId,
      organizationId: currentOrganizationId,
      teamId: currentTeamId
    };

    const medicationId = await ctx.db.insert("medication", medicationData);

    // Create medication intake records for the next 7 days
    await createMedicationIntakes(
      ctx,
      medicationId,
      { ...medication, residentId },
      currentOrganizationId,
      currentTeamId
    );

    return medicationId;
  }
});

export const getActiveByTeamId = query({
  args: {
    teamId: v.string()
  },
  handler: async (ctx, args) => {
    const medication = await ctx.db
      .query("medication")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Include resident details in the medication data
    const medicationWithResident = await Promise.all(
      medication.map(async (medication) => {
        const resident = await ctx.db.get(medication.residentId);
        return { ...medication, resident };
      })
    );
    return medicationWithResident;
  }
});

export const getMedicationIntakesByTeamId = query({
  args: {
    teamId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.id("residents"),
      scheduledTime: v.number(),
      poppedOutAt: v.optional(v.number()),
      poppedOutByUserId: v.optional(v.string()),
      state: v.union(
        v.literal("scheduled"),
        v.literal("dispensed"),
        v.literal("administered"),
        v.literal("missed"),
        v.literal("refused"),
        v.literal("skipped")
      ),
      stateModifiedByUserId: v.optional(v.string()),
      stateModifiedAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any()),
      resident: v.optional(v.any())
    })
  ),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("medicationIntake")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId));

    // Add date filtering if provided
    if (args.startDate) {
      query = query.filter((q) =>
        q.gte(q.field("scheduledTime"), args.startDate!)
      );
    }
    if (args.endDate) {
      query = query.filter((q) =>
        q.lte(q.field("scheduledTime"), args.endDate!)
      );
    }

    const intakes = await query.order("asc").collect();

    // Include medication and resident details
    const intakesWithDetails = await Promise.all(
      intakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId);
        return { ...intake, medication, resident };
      })
    );

    return intakesWithDetails;
  }
});

export const updateMedicationIntakeState = mutation({
  args: {
    intakeId: v.id("medicationIntake"),
    state: v.union(
      v.literal("scheduled"),
      v.literal("dispensed"),
      v.literal("administered"),
      v.literal("missed"),
      v.literal("refused"),
      v.literal("skipped")
    ),
    notes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current session for authentication
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.token) {
      throw new Error("Not authenticated");
    }

    // Get current user information
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("User not found");
    }

    const updateData: any = {
      state: args.state,
      stateModifiedByUserId: userMetadata.userId,
      stateModifiedAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add notes if provided
    if (args.notes !== undefined) {
      updateData.notes = args.notes;
    }

    await ctx.db.patch(args.intakeId, updateData);
    return null;
  }
});

export const markMedicationAsDispensed = mutation({
  args: {
    intakeId: v.id("medicationIntake"),
    notes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current session for authentication
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.token) {
      throw new Error("Not authenticated");
    }

    // Get current user information
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("User not found");
    }

    const updateData: any = {
      state: "dispensed" as const,
      poppedOutAt: Date.now(),
      poppedOutByUserId: userMetadata.userId,
      stateModifiedByUserId: userMetadata.userId,
      stateModifiedAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add notes if provided
    if (args.notes !== undefined) {
      updateData.notes = args.notes;
    }

    await ctx.db.patch(args.intakeId, updateData);
    return null;
  }
});

export const getTodaysMedicationIntakes = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.id("residents"),
      scheduledTime: v.number(),
      poppedOutAt: v.optional(v.number()),
      poppedOutByUserId: v.optional(v.string()),
      state: v.union(
        v.literal("scheduled"),
        v.literal("dispensed"),
        v.literal("administered"),
        v.literal("missed"),
        v.literal("refused"),
        v.literal("skipped")
      ),
      stateModifiedByUserId: v.optional(v.string()),
      stateModifiedAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any()),
      resident: v.optional(v.any())
    })
  ),
  handler: async (ctx, args) => {
    // Get current date boundaries (start and end of today in local time)
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, // Start at midnight
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23, // End at 11:59:59 PM
      59,
      59,
      999
    );

    console.log(
      `Getting today's intakes from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`
    );

    // Query medication intakes for today
    const todaysIntakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledTime"), startOfDay.getTime()),
          q.lte(q.field("scheduledTime"), endOfDay.getTime())
        )
      )
      .order("asc")
      .collect();

    // Include medication and resident details
    const intakesWithDetails = await Promise.all(
      todaysIntakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId);
        return { ...intake, medication, resident };
      })
    );

    console.log(
      `Found ${intakesWithDetails.length} medication intakes for today`
    );
    return intakesWithDetails;
  }
});
