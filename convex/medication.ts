import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalQuery,
  internalMutation
} from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

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
    residentId?: string;
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

  const intakeRecords: any[] = [];

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
        residentId: medication.residentId!!,
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
    residentId: v.optional(v.string()),
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
      ...(residentId && { residentId }),
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
        const resident = medication.residentId
          ? await ctx.db.get(medication.residentId as Id<"residents">)
          : null;
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
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
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
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);
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

export const getTodaysMedicationIntakes = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
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
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);
        return { ...intake, medication, resident };
      })
    );

    console.log(
      `Found ${intakesWithDetails.length} medication intakes for today`
    );

    // DEBUG: If no intakes found today, let's check what's coming up
    if (intakesWithDetails.length === 0) {
      console.log("No intakes for today, checking upcoming intakes...");
      const upcomingIntakes = await ctx.db
        .query("medicationIntake")
        .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
        .filter((q) => q.gte(q.field("scheduledTime"), now.getTime()))
        .order("asc")
        .take(5);

      console.log(`Found ${upcomingIntakes.length} upcoming intakes:`);
      upcomingIntakes.forEach((intake) => {
        console.log(
          `- Scheduled for: ${new Date(intake.scheduledTime).toLocaleString()}`
        );
      });
    }

    return intakesWithDetails;
  }
});

export const getMedicationIntakesByDate = query({
  args: {
    teamId: v.string(),
    date: v.number() // Timestamp for the selected date
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any()),
      resident: v.optional(v.any())
    })
  ),
  handler: async (ctx, args): Promise<any[]> => {
    // Convert the date timestamp to start and end of that day
    const selectedDate = new Date(args.date);
    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      0, // Start at midnight
      0,
      0,
      0
    );
    const endOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      23, // End at 11:59:59 PM
      59,
      59,
      999
    );

    console.log(
      `Getting intakes for ${selectedDate.toDateString()} from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`
    );

    // Query medication intakes for the selected date
    const dateIntakes = await ctx.db
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

    // Include medication and resident details with image
    const intakesWithDetails = await Promise.all(
      dateIntakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);

        // Get resident image and add imageUrl to resident object
        const residentImage = await ctx.runQuery(
          api.files.image.getResidentImageByResidentId,
          {
            residentId: intake.residentId as string
          }
        );

        console.log("RESIDENT IMAGE", residentImage);

        const residentWithImage = {
          ...resident,
          imageUrl: residentImage?.url || "No image"
        };

        console.log(residentWithImage);
        return { ...intake, medication, resident: residentWithImage };
      })
    );

    console.log(
      `Found ${intakesWithDetails.length} medication intakes for ${selectedDate.toDateString()}`
    );

    return intakesWithDetails;
  }
});

// New query to get upcoming medication intakes (next 7 days)
export const getUpcomingMedicationIntakes = query({
  args: {
    teamId: v.string(),
    daysAhead: v.optional(v.number()) // How many days to look ahead (default 7)
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
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
    const daysAhead = args.daysAhead || 7;
    const now = new Date();

    // Start from beginning of today
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );

    // End at the end of the specified days ahead
    const endDate = new Date(startOfToday);
    endDate.setDate(startOfToday.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    console.log(
      `Getting upcoming intakes from ${startOfToday.toISOString()} to ${endDate.toISOString()}`
    );

    // Query medication intakes for the upcoming period
    const upcomingIntakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledTime"), startOfToday.getTime()),
          q.lte(q.field("scheduledTime"), endDate.getTime())
        )
      )
      .order("asc")
      .collect();

    // Include medication and resident details
    const intakesWithDetails = await Promise.all(
      upcomingIntakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);
        return { ...intake, medication, resident };
      })
    );

    console.log(
      `Found ${intakesWithDetails.length} upcoming medication intakes`
    );

    return intakesWithDetails;
  }
});

export const getAllActiveMedications = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("medication"),
      _creationTime: v.number(),
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
      ),
      residentId: v.optional(v.string()),
      createdByUserId: v.string(),
      organizationId: v.string(),
      teamId: v.string()
    })
  ),
  handler: async (ctx, args) => {
    const activeMedications = await ctx.db
      .query("medication")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return activeMedications;
  }
});

export const getLastScheduledTimeForMedication = internalQuery({
  args: {
    medicationId: v.id("medication")
  },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    const lastIntake = await ctx.db
      .query("medicationIntake")
      .withIndex("byMedicationId", (q) =>
        q.eq("medicationId", args.medicationId)
      )
      .order("desc")
      .first();

    return lastIntake ? lastIntake.scheduledTime : null;
  }
});

export const getMedicationIntakeCount = internalQuery({
  args: {
    medicationId: v.id("medication")
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const intakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byMedicationId", (q) =>
        q.eq("medicationId", args.medicationId)
      )
      .collect();

    return intakes.length;
  }
});

export const createInitialMedicationIntakes = internalMutation({
  args: {
    medicationId: v.id("medication"),
    organizationId: v.string(),
    teamId: v.string()
  },
  returns: v.array(v.id("medicationIntake")),
  handler: async (ctx, args) => {
    const medication = await ctx.db.get(args.medicationId);
    if (!medication) {
      console.log(`Medication with ID ${args.medicationId} not found`);
      return [];
    }

    console.log(`Creating initial intakes for medication: ${medication.name}`);

    // Use the existing helper function to create initial intakes
    const intakeRecords = await createMedicationIntakes(
      ctx,
      args.medicationId,
      {
        name: medication.name,
        frequency: medication.frequency,
        times: medication.times,
        startDate: medication.startDate,
        endDate: medication.endDate,
        scheduleType: medication.scheduleType,
        residentId: medication.residentId!
      },
      args.organizationId,
      args.teamId
    );

    return intakeRecords || [];
  }
});

export const createNextDayMedicationIntakes = internalMutation({
  args: {
    medicationId: v.id("medication"),
    organizationId: v.string(),
    teamId: v.string()
  },
  returns: v.array(v.id("medicationIntake")),
  handler: async (ctx, args) => {
    const medication = await ctx.db.get(args.medicationId);
    if (!medication) {
      console.log(`Medication with ID ${args.medicationId} not found`);
      return [];
    }

    console.log(`Creating next day intakes for medication: ${medication.name}`);

    // Only create intakes for scheduled medications, not PRN
    if (medication.scheduleType === "PRN (As Needed)") {
      console.log(
        `Medication "${medication.name}" is PRN (As Needed) - no scheduled intakes created`
      );
      return [];
    }

    // Get the last scheduled time for this medication
    const lastScheduledTime: number | null = await ctx.runQuery(
      internal.medication.getLastScheduledTimeForMedication,
      {
        medicationId: args.medicationId
      }
    );

    if (!lastScheduledTime) {
      console.log(
        `No existing intakes found for medication: ${medication.name}`
      );
      return [];
    }

    const lastScheduledDate: Date = new Date(lastScheduledTime);
    console.log(
      `Last scheduled date for ${medication.name}: ${lastScheduledDate.toLocaleDateString()} ${lastScheduledDate.toLocaleTimeString()}`
    );

    // Calculate the next day based on frequency
    let dayIncrement: number = 1;
    if (medication.frequency === "Weekly") {
      dayIncrement = 7;
    } else if (medication.frequency === "Monthly") {
      dayIncrement = 30;
    } else if (medication.frequency === "One time (STAT)") {
      console.log(
        `Medication "${medication.name}" is one-time (STAT) - no additional intakes needed`
      );
      return [];
    }

    // Calculate next scheduled date
    const nextDate: Date = new Date(lastScheduledDate);
    nextDate.setDate(lastScheduledDate.getDate() + dayIncrement);

    // Check if next date is within medication's end date range
    if (medication.endDate) {
      const endDate = new Date(medication.endDate);
      console.log(`Medication end date: ${endDate.toLocaleDateString()}`);
      console.log(`Next scheduled date: ${nextDate.toLocaleDateString()}`);

      if (nextDate > endDate) {
        console.log(
          `Next scheduled date (${nextDate.toLocaleDateString()}) is beyond medication end date (${endDate.toLocaleDateString()}) - skipping`
        );
        return [];
      }
    }

    console.log(
      `Creating intakes for ${medication.name} on ${nextDate.toLocaleDateString()}`
    );
    console.log(`Medication times: ${medication.times.join(", ")}`);

    const intakeRecords: any[] = [];

    // Create intake record for each scheduled time on the next day
    for (const time of medication.times) {
      const [hours, minutes] = time.split(":");
      const scheduledDateTime: Date = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
        parseInt(hours),
        parseInt(minutes),
        0,
        0
      );

      console.log(
        `Creating intake for: ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString(
          "en-GB",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }
        )} (Local time)`
      );

      const intakeRecord = {
        medicationId: args.medicationId,
        residentId: medication.residentId!,
        scheduledTime: scheduledDateTime.getTime(),
        state: "scheduled" as const,
        teamId: args.teamId,
        organizationId: args.organizationId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const intakeId: any = await ctx.db.insert(
        "medicationIntake",
        intakeRecord
      );
      intakeRecords.push(intakeId);
      console.log(`Created intake record with ID: ${intakeId}`);
    }

    console.log(
      `Created ${intakeRecords.length} medication intake records for "${medication.name}" on ${nextDate.toLocaleDateString()}`
    );
    return intakeRecords;
  }
});

export const dailyMedicationCron = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("CRON", new Date());

    // Get all active medications
    const activeMedications = await ctx.runQuery(
      internal.medication.getAllActiveMedications,
      {}
    );

    console.log(`Found ${activeMedications.length} active medications:`);

    activeMedications.forEach((medication: any, index: number) => {
      console.log(
        `${index + 1}. ${medication.name} (${medication.strength}${medication.strengthUnit}) - ${medication.frequency}`
      );
      console.log(
        `   Route: ${medication.route}, Form: ${medication.dosageForm}`
      );
      console.log(`   Prescriber: ${medication.prescriberName}`);
      console.log(
        `   Organization: ${medication.organizationId}, Team: ${medication.teamId}`
      );
      console.log(`   ---`);
    });

    console.log("\n=== STARTING NEXT DAY INTAKE CREATION ===");

    // First, let's check if any medications have existing intakes
    console.log("\n=== DIAGNOSTIC: Checking existing intakes ===");
    for (const medication of activeMedications) {
      const intakeCount = await ctx.runQuery(
        internal.medication.getMedicationIntakeCount,
        {
          medicationId: medication._id
        }
      );
      console.log(
        `Medication "${medication.name}": ${intakeCount} existing intake records`
      );
    }

    // Process each active medication to create next day intakes
    let totalCreatedIntakes = 0;
    for (const medication of activeMedications) {
      console.log(`\n--- Processing medication: ${medication.name} ---`);

      // Get the last scheduled time for this medication
      const lastScheduledTime = await ctx.runQuery(
        internal.medication.getLastScheduledTimeForMedication,
        {
          medicationId: medication._id
        }
      );

      if (!lastScheduledTime) {
        console.log(
          `No existing intakes found for medication: ${medication.name}`
        );
        console.log(
          `This appears to be a new medication without any intake records yet.`
        );
        console.log(`Creating initial intakes for this medication...`);

        const initialIntakes = await ctx.runMutation(
          internal.medication.createInitialMedicationIntakes,
          {
            medicationId: medication._id,
            organizationId: medication.organizationId,
            teamId: medication.teamId
          }
        );

        totalCreatedIntakes += initialIntakes.length;
        console.log(
          `Created ${initialIntakes.length} initial intakes for ${medication.name}`
        );
        continue;
      }

      const lastScheduledDate = new Date(lastScheduledTime);
      const startDate = new Date(medication.startDate);
      const endDate = medication.endDate ? new Date(medication.endDate) : null;

      console.log(`Last scheduled: ${lastScheduledDate.toLocaleDateString()}`);
      console.log(`Medication start date: ${startDate.toLocaleDateString()}`);
      if (endDate) {
        console.log(`Medication end date: ${endDate.toLocaleDateString()}`);
      }

      // Check if the last scheduled time is within the medication's date range
      const isWithinStartDate = lastScheduledDate >= startDate;
      const isWithinEndDate = !endDate || lastScheduledDate <= endDate;

      console.log(`Within start date range: ${isWithinStartDate}`);
      console.log(`Within end date range: ${isWithinEndDate}`);

      if (isWithinStartDate && isWithinEndDate) {
        console.log(
          `Last scheduled time is within date range - creating next day intakes`
        );

        const createdIntakes = await ctx.runMutation(
          internal.medication.createNextDayMedicationIntakes,
          {
            medicationId: medication._id,
            organizationId: medication.organizationId,
            teamId: medication.teamId
          }
        );

        totalCreatedIntakes += createdIntakes.length;
        console.log(
          `Created ${createdIntakes.length} intakes for ${medication.name}`
        );
      } else {
        console.log(
          `Last scheduled time is outside date range - skipping intake creation`
        );
      }
    }

    console.log(`\n=== CRON COMPLETED ===`);
    console.log(
      `Total active medications processed: ${activeMedications.length}`
    );
    console.log(`Total new intakes created: ${totalCreatedIntakes}`);

    return null;
  }
});

export const markMedicationIntakeAsPoppedOut = mutation({
  args: {
    medicationIntakeId: v.id("medicationIntake")
  },
  returns: v.boolean(),
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

    const { medicationIntakeId } = args;
    const medicationIntake = await ctx.db.get(medicationIntakeId);
    console.log("medicationIntake", medicationIntake);
    if (!medicationIntake) {
      throw new Error(
        `Medication intake with ID ${medicationIntakeId} not found`
      );
    }

    console.log("medicationIntake", medicationIntake);

    const alreadyPoppedOut = medicationIntake.poppedOutAt !== undefined;
    if (alreadyPoppedOut) {
      throw new Error("Medication intake already popped out");
    }

    const medication = await ctx.db.get(medicationIntake.medicationId);
    if (!medication) {
      throw new Error(
        `Medication with ID ${medicationIntake.medicationId} not found`
      );
    }

    if (medication.totalCount <= 0) {
      throw new Error("No medication available to pop out");
    }

    await ctx.db.patch(medicationIntakeId, {
      poppedOutAt: Date.now(),
      poppedOutByUserId: userMetadata.userId
    });

    await ctx.db.patch(medicationIntake.medicationId, {
      totalCount: medication.totalCount - 1
    });

    return true;
  }
});

export const setWithnessForMedicationIntake = mutation({
  args: {
    medicationIntakeId: v.id("medicationIntake"),
    witnessByUserId: v.string()
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { medicationIntakeId, witnessByUserId } = args;
    const medicationIntake = await ctx.db.get(medicationIntakeId);
    if (!medicationIntake) {
      throw new Error(
        `Medication intake with ID ${medicationIntakeId} not found`
      );
    }

    await ctx.db.patch(medicationIntakeId, {
      witnessByUserId: witnessByUserId,
      witnessAt: Date.now()
    });

    return true;
  }
});

export const updateMedicationIntakeStatus = mutation({
  args: {
    intakeId: v.id("medicationIntake"),
    state: v.union(
      v.literal("scheduled"),
      v.literal("dispensed"),
      v.literal("administered"),
      v.literal("missed"),
      v.literal("refused"),
      v.literal("skipped")
    )
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if the intake exists
    const existingIntake = await ctx.db.get(args.intakeId);
    if (!existingIntake) {
      throw new Error(`Medication intake with ID ${args.intakeId} not found`);
    }

    // Update only the state field
    await ctx.db.patch(args.intakeId, {
      state: args.state,
      updatedAt: Date.now()
    });

    return null;
  }
});

export const saveMedicationIntakeComment = mutation({
  args: {
    intakeId: v.id("medicationIntake"),
    comment: v.string()
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

    // Check if the intake exists
    const existingIntake = await ctx.db.get(args.intakeId);
    if (!existingIntake) {
      throw new Error(`Medication intake with ID ${args.intakeId} not found`);
    }

    // Update the notes field with the comment
    await ctx.db.patch(args.intakeId, {
      notes: args.comment,
      updatedAt: Date.now()
    });

    return null;
  }
});

export const getNextMedicationIntakeByResidentId = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.union(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the next scheduled medication intake for this resident
    const nextIntake = await ctx.db
      .query("medicationIntake")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledTime"), now), // Only future intakes
          q.eq(q.field("state"), "scheduled") // Only scheduled (not completed/missed)
        )
      )
      .order("asc") // Order by scheduled time ascending to get the earliest
      .first();

    if (!nextIntake) {
      return null;
    }

    // Get medication details
    const medication = await ctx.db.get(nextIntake.medicationId);

    return {
      ...nextIntake,
      medication
    };
  }
});

export const getPrnOrTopicalMedicationsByResidentId = query({
  args: {
    residentId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all active medications for this resident
    const medications = await ctx.db
      .query("medication")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter for PRN or Topical medications
    const prnOrTopical = medications.filter(
      (medication) =>
        medication.scheduleType === "PRN (As Needed)" ||
        medication.route === "Topical"
    );

    return prnOrTopical;
  }
});

export const getActiveMedicationsByResidentId = query({
  args: {
    residentId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all active medications for this resident
    const medications = await ctx.db
      .query("medication")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return medications;
  }
});

export const getAllMedicationIntakesByResidentId = query({
  args: {
    residentId: v.string()
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any()),
      resident: v.optional(v.any())
    })
  ),
  handler: async (ctx, args): Promise<any[]> => {
    // Query all medication intakes for this resident
    const intakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .order("desc") // Most recent first
      .collect();

    // Include medication and resident details
    const intakesWithDetails = await Promise.all(
      intakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);

        return { ...intake, medication, resident };
      })
    );

    return intakesWithDetails;
  }
});

export const getMedicationIntakesByResidentAndDate = query({
  args: {
    residentId: v.string(),
    date: v.number() // Timestamp for the selected date
  },
  returns: v.array(
    v.object({
      _id: v.id("medicationIntake"),
      _creationTime: v.number(),
      medicationId: v.id("medication"),
      residentId: v.string(),
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
      witnessByUserId: v.optional(v.string()),
      witnessAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      teamId: v.string(),
      organizationId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      medication: v.optional(v.any()),
      resident: v.optional(v.any())
    })
  ),
  handler: async (ctx, args): Promise<any[]> => {
    // Convert the date timestamp to start and end of that day
    const selectedDate = new Date(args.date);
    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      0, // Start at midnight
      0,
      0,
      0
    );
    const endOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      23, // End at 11:59:59 PM
      59,
      59,
      999
    );

    console.log(
      `Getting intakes for resident ${args.residentId} on ${selectedDate.toDateString()} from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`
    );

    // Query medication intakes for the selected date and resident
    const dateIntakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.gte(q.field("scheduledTime"), startOfDay.getTime()),
          q.lte(q.field("scheduledTime"), endOfDay.getTime())
        )
      )
      .order("asc")
      .collect();

    // Include medication and resident details with image
    const intakesWithDetails = await Promise.all(
      dateIntakes.map(async (intake) => {
        const medication = await ctx.db.get(intake.medicationId);
        const resident = await ctx.db.get(intake.residentId as Id<"residents">);

        // Get resident image and add imageUrl to resident object
        const residentImage = await ctx.runQuery(
          api.files.image.getResidentImageByResidentId,
          {
            residentId: intake.residentId as string
          }
        );

        const residentWithImage = {
          ...resident,
          imageUrl: residentImage?.url || "No image"
        };

        return { ...intake, medication, resident: residentWithImage };
      })
    );

    console.log(
      `Found ${intakesWithDetails.length} medication intakes for resident ${args.residentId} on ${selectedDate.toDateString()}`
    );

    return intakesWithDetails;
  }
});

export const createAndAdministerMedicationIntake = mutation({
  args: {
    medicationId: v.id("medication"),
    notes: v.optional(v.string()),
    witnessedBy: v.string(),
    time: v.number(),
    units: v.number()
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

    // Get the medication details
    const medication = await ctx.db.get(args.medicationId);
    if (!medication) {
      throw new Error("Medication not found");
    }

    if (!medication.residentId) {
      throw new Error("Medication must be associated with a resident");
    }

    // Check if there's enough medication stock
    if (medication.totalCount < args.units) {
      throw new Error(
        `Insufficient medication stock. Available: ${medication.totalCount}, Required: ${args.units}`
      );
    }

    // Create multiple medication intake records based on units
    const intakeIds: Id<"medicationIntake">[] = [];
    const now = Date.now();

    for (let i = 0; i < args.units; i++) {
      const intakeId = await ctx.db.insert("medicationIntake", {
        medicationId: args.medicationId,
        residentId: medication.residentId,
        scheduledTime: args.time,
        state: "administered",
        stateModifiedByUserId: userMetadata.userId,
        stateModifiedAt: now,
        poppedOutAt: args.time,
        poppedOutByUserId: userMetadata.userId,
        witnessByUserId: args.witnessedBy,
        witnessAt: args.time,
        notes: args.notes,
        teamId: medication.teamId,
        organizationId: medication.organizationId,
        createdAt: now,
        updatedAt: now
      });
      intakeIds.push(intakeId);
    }

    // Decrement the medication total count by the number of units administered
    await ctx.db.patch(args.medicationId, {
      totalCount: medication.totalCount - args.units
    });

    console.log(
      `Created and administered ${args.units} medication intake(s) for medication ${medication.name}: ${intakeIds.join(", ")}`
    );

    return null;
  }
});
