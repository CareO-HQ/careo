import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Helper function to format time duration into human-readable string
 * Converts minutes to hours if > 60 minutes
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Helper function to format overdue time
 * Returns a human-readable string for how long something is overdue
 */
function formatOverdueTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000));
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));

  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Generate food/fluid alerts for all active residents
 * This function is called by the cron job every hour
 */
export const generateFoodFluidAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentHour = now.getHours();

    // Get all active residents
    const residents = await ctx.db
      .query("residents")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), undefined),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    console.log(
      `[Alert Generation] Checking ${residents.length} residents for food/fluid alerts at ${now.toISOString()}`
    );

    let alertsCreated = 0;

    for (const resident of residents) {
      // Get all food/fluid logs for today
      const logs = await ctx.db
        .query("foodFluidLogs")
        .filter((q) =>
          q.and(
            q.eq(q.field("residentId"), resident._id),
            q.eq(q.field("date"), today)
          )
        )
        .collect();

      // Check which time periods have logs
      const hasMorning = logs.some((log) => log.section === "Morning");
      const hasAfternoon = logs.some((log) => log.section === "Afternoon");
      const hasEvening = logs.some((log) => log.section === "Evening");
      const hasNight = logs.some((log) => log.section === "Night");

      // Morning (6 AM - 12 PM): Alert after 12 PM if no logs
      if (!hasMorning && currentHour >= 12) {
        const result = await ctx.runMutation(internal.alerts.createAlert, {
          residentId: resident._id,
          alertType: "food_fluid",
          severity: "critical",
          title: "No food/fluid logged - Morning",
          message: `No food or fluid intake has been recorded for ${resident.firstName} ${resident.lastName} during the morning period (6 AM - 12 PM).`,
          timePeriod: "morning",
          metadata: { date: today, section: "Morning" },
          organizationId: resident.organizationId,
          teamId: resident.teamId,
        });
        if (result.created) alertsCreated++;
      }

      // Afternoon (12 PM - 6 PM): Alert after 6 PM if no logs
      if (!hasAfternoon && currentHour >= 18) {
        const result = await ctx.runMutation(internal.alerts.createAlert, {
          residentId: resident._id,
          alertType: "food_fluid",
          severity: "critical",
          title: "No food/fluid logged - Afternoon",
          message: `No food or fluid intake has been recorded for ${resident.firstName} ${resident.lastName} during the afternoon period (12 PM - 6 PM).`,
          timePeriod: "afternoon",
          metadata: { date: today, section: "Afternoon" },
          organizationId: resident.organizationId,
          teamId: resident.teamId,
        });
        if (result.created) alertsCreated++;
      }

      // Evening (6 PM - 10 PM): Alert after 10 PM if no logs
      if (!hasEvening && currentHour >= 22) {
        const result = await ctx.runMutation(internal.alerts.createAlert, {
          residentId: resident._id,
          alertType: "food_fluid",
          severity: "critical",
          title: "No food/fluid logged - Evening",
          message: `No food or fluid intake has been recorded for ${resident.firstName} ${resident.lastName} during the evening period (6 PM - 10 PM).`,
          timePeriod: "evening",
          metadata: { date: today, section: "Evening" },
          organizationId: resident.organizationId,
          teamId: resident.teamId,
        });
        if (result.created) alertsCreated++;
      }

      // Night (10 PM - 6 AM): Alert after 6 AM next day if no logs
      // Note: For night shift, we check the previous day's night section
      if (!hasNight && currentHour >= 6 && currentHour < 12) {
        const result = await ctx.runMutation(internal.alerts.createAlert, {
          residentId: resident._id,
          alertType: "food_fluid",
          severity: "warning",
          title: "No food/fluid logged - Night",
          message: `No food or fluid intake has been recorded for ${resident.firstName} ${resident.lastName} during the night period (10 PM - 6 AM).`,
          timePeriod: "night",
          metadata: { date: today, section: "Night" },
          organizationId: resident.organizationId,
          teamId: resident.teamId,
        });
        if (result.created) alertsCreated++;
      }
    }

    console.log(
      `[Alert Generation] Created ${alertsCreated} new food/fluid alerts`
    );

    return { alertsCreated, residentsChecked: residents.length };
  },
});

/**
 * Generate night check alerts for all active residents
 * This function is called by the cron job every hour
 *
 * Alert Logic:
 * 1. Positioning: Alert if no recording within frequency window
 * 2. Bed Rails: Alert if no check within frequency window
 * 3. General Night Check: Alert if no check during night shift (10 PM - 6 AM)
 */
export const generateNightCheckAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentHour = now.getHours();
    const currentTimeMs = now.getTime();

    // Only run during night shift hours (10 PM - 6 AM)
    const isNightShift = currentHour >= 22 || currentHour < 6;

    console.log(
      `[Night Check Alerts] Running at ${now.toISOString()}, isNightShift: ${isNightShift}`
    );

    // Get all active residents
    const residents = await ctx.db
      .query("residents")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), undefined),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    let alertsCreated = 0;

    for (const resident of residents) {
      // Get all active night check configurations for this resident
      const configs = await ctx.db
        .query("nightCheckConfigurations")
        .withIndex("by_resident_active", (q) =>
          q.eq("residentId", resident._id).eq("isActive", true)
        )
        .collect();

      for (const config of configs) {
        // Get the latest recording for this configuration (not just today, but any recent recording)
        const recordings = await ctx.db
          .query("nightCheckRecordings")
          .withIndex("by_configuration", (q) =>
            q.eq("configurationId", config._id)
          )
          .order("desc")
          .take(1);

        const latestRecording = recordings[0];

        // Check if alert is needed based on check type
        let shouldAlert = false;
        let alertTitle = "";
        let alertMessage = "";
        let alertSeverity: "critical" | "warning" = "warning";

        if (config.checkType === "positioning") {
          // Positioning checks: Alert if overdue based on frequency
          if (config.frequencyMinutes) {
            if (!latestRecording) {
              // No recording ever made - create a warning
              shouldAlert = true;
              alertSeverity = "warning";
              alertTitle = "Positioning check not recorded";
              alertMessage = `No repositioning check has been recorded for ${resident.firstName} ${resident.lastName}. Scheduled every ${formatDuration(config.frequencyMinutes)}.`;
            } else {
              const frequencyMs = config.frequencyMinutes * 60 * 1000;
              const lastCheckTime = latestRecording.recordDateTime;
              const timeSinceLastCheck = currentTimeMs - lastCheckTime;

              // Alert if overdue by more than 15 minutes
              if (timeSinceLastCheck > frequencyMs + 15 * 60 * 1000) {
                shouldAlert = true;
                alertSeverity = "critical";
                alertTitle = "Positioning check overdue";
                const overdueMs = timeSinceLastCheck - frequencyMs;
                const overdueTime = formatOverdueTime(overdueMs);
                alertMessage = `Repositioning check for ${resident.firstName} ${resident.lastName} is overdue by ${overdueTime}. Scheduled every ${formatDuration(config.frequencyMinutes)}.`;
              }
            }
          }
        } else if (config.checkType === "bed_rails") {
          // Bed rails: Alert if not checked during night shift
          if (isNightShift && !latestRecording) {
            shouldAlert = true;
            alertSeverity = "warning";
            alertTitle = "Bed rails check pending";
            alertMessage = `Bed rails have not been checked for ${resident.firstName} ${resident.lastName} during tonight's shift.`;
          }
        } else if (config.checkType === "night_check") {
          // General night check: Alert if not done during night shift
          if (isNightShift && !latestRecording) {
            shouldAlert = true;
            alertSeverity = "warning";
            alertTitle = "Night check pending";
            alertMessage = `Night check has not been completed for ${resident.firstName} ${resident.lastName} during tonight's shift.`;
          }
        } else if (config.checkType === "pad_change") {
          // Pad change: Alert if overdue based on frequency
          if (config.frequencyMinutes) {
            if (!latestRecording) {
              // No recording ever made - create a warning
              shouldAlert = true;
              alertSeverity = "warning";
              alertTitle = "Pad change not recorded";
              alertMessage = `No pad change has been recorded for ${resident.firstName} ${resident.lastName}. Scheduled every ${formatDuration(config.frequencyMinutes)}.`;
            } else {
              const frequencyMs = config.frequencyMinutes * 60 * 1000;
              const lastCheckTime = latestRecording.recordDateTime;
              const timeSinceLastCheck = currentTimeMs - lastCheckTime;

              // Alert if overdue by more than 30 minutes
              if (timeSinceLastCheck > frequencyMs + 30 * 60 * 1000) {
                shouldAlert = true;
                alertSeverity = "critical";
                alertTitle = "Pad change overdue";
                const overdueMs = timeSinceLastCheck - frequencyMs;
                const overdueTime = formatOverdueTime(overdueMs);
                alertMessage = `Pad change for ${resident.firstName} ${resident.lastName} is overdue by ${overdueTime}. Scheduled every ${formatDuration(config.frequencyMinutes)}.`;
              }
            }
          }
        }

        // Create alert if needed
        if (shouldAlert) {
          const result = await ctx.runMutation(internal.alerts.createAlert, {
            residentId: resident._id,
            alertType: "night_check",
            severity: alertSeverity,
            title: alertTitle,
            message: alertMessage,
            metadata: {
              date: today,
              checkType: config.checkType,
              configurationId: config._id,
              frequencyMinutes: config.frequencyMinutes,
            },
            organizationId: resident.organizationId,
            teamId: resident.teamId,
          });
          if (result.created) alertsCreated++;
        }
      }
    }

    console.log(
      `[Night Check Alerts] Created ${alertsCreated} new night check alerts`
    );

    return { alertsCreated, residentsChecked: residents.length };
  },
});

/**
 * Generate medication alerts for all active residents
 * This function is called by the cron job every 15 minutes
 *
 * Alert Logic:
 * 1. Due Soon: Medication scheduled within next 30 minutes
 * 2. Overdue: Medication past scheduled time by 15+ minutes
 * 3. Missed: Medication in "missed" state that wasn't alerted
 */
export const generateMedicationAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const nowDate = new Date(now);

    console.log(
      `[Medication Alerts] Running at ${nowDate.toISOString()}`
    );

    // Time windows
    const thirtyMinutesFromNow = now + 30 * 60 * 1000; // 30 minutes ahead
    const fifteenMinutesAgo = now - 15 * 60 * 1000; // 15 minutes ago

    // Get all scheduled medication intakes
    const allIntakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byState", (q) => q.eq("state", "scheduled"))
      .collect();

    console.log(`[Medication Alerts] Found ${allIntakes.length} scheduled intakes`);

    let alertsCreated = 0;
    const residentIds = new Set<string>();

    for (const intake of allIntakes) {
      residentIds.add(intake.residentId);

      // Get resident info for alert message
      const resident = await ctx.db.get(intake.residentId as Id<"residents">);
      if (!resident || (resident.status && resident.status !== "active")) {
        continue; // Skip inactive residents
      }

      // Get medication info
      const medication = await ctx.db.get(intake.medicationId);
      if (!medication) continue;

      const scheduledTime = intake.scheduledTime;
      let shouldAlert = false;
      let alertSeverity: "critical" | "warning" | "info" = "info";
      let alertTitle = "";
      let alertMessage = "";

      // Check 1: Due within 30 minutes (Info alert)
      if (scheduledTime <= thirtyMinutesFromNow && scheduledTime > now) {
        const minutesUntilDue = Math.floor((scheduledTime - now) / (60 * 1000));
        shouldAlert = true;
        alertSeverity = "info";
        alertTitle = "Medication due soon";
        alertMessage = `${medication.name} (${medication.strength}${medication.strengthUnit}) for ${resident.firstName} ${resident.lastName} is due in ${minutesUntilDue} minute${minutesUntilDue !== 1 ? 's' : ''}.`;
      }
      // Check 2: Overdue by 15+ minutes (Critical alert)
      else if (scheduledTime < fifteenMinutesAgo) {
        const overdueMs = now - scheduledTime;
        const overdueTime = formatOverdueTime(overdueMs);

        shouldAlert = true;
        alertSeverity = "critical";
        alertTitle = "Medication overdue";
        alertMessage = `${medication.name} (${medication.strength}${medication.strengthUnit}) for ${resident.firstName} ${resident.lastName} is overdue by ${overdueTime}.`;
      }

      // Create alert if needed
      if (shouldAlert) {
        const result = await ctx.runMutation(internal.alerts.createAlert, {
          residentId: resident._id,
          alertType: "medication",
          severity: alertSeverity,
          title: alertTitle,
          message: alertMessage,
          metadata: {
            intakeId: intake._id,
            medicationId: medication._id,
            medicationName: medication.name,
            scheduledTime: scheduledTime,
          },
          organizationId: resident.organizationId,
          teamId: resident.teamId,
        });
        if (result.created) alertsCreated++;
      }
    }

    // Check for missed doses (separate query)
    const missedIntakes = await ctx.db
      .query("medicationIntake")
      .withIndex("byState", (q) => q.eq("state", "missed"))
      .collect();

    console.log(`[Medication Alerts] Found ${missedIntakes.length} missed intakes`);

    for (const intake of missedIntakes) {
      // Check if alert already exists for this missed intake
      const existingAlert = await ctx.db
        .query("alerts")
        .withIndex("byResidentAndType", (q) =>
          q.eq("residentId", intake.residentId as Id<"residents">).eq("alertType", "medication")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("isResolved"), false),
            q.eq(q.field("metadata.intakeId"), intake._id)
          )
        )
        .first();

      if (existingAlert) continue; // Alert already exists

      const resident = await ctx.db.get(intake.residentId as Id<"residents">);
      if (!resident || (resident.status && resident.status !== "active")) {
        continue;
      }

      const medication = await ctx.db.get(intake.medicationId);
      if (!medication) continue;

      residentIds.add(intake.residentId);

      const result = await ctx.runMutation(internal.alerts.createAlert, {
        residentId: resident._id,
        alertType: "medication",
        severity: "warning",
        title: "Missed medication dose",
        message: `${medication.name} (${medication.strength}${medication.strengthUnit}) dose was missed for ${resident.firstName} ${resident.lastName} at ${new Date(intake.scheduledTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`,
        metadata: {
          intakeId: intake._id,
          medicationId: medication._id,
          medicationName: medication.name,
          scheduledTime: intake.scheduledTime,
          missedReason: "marked_as_missed",
        },
        organizationId: resident.organizationId,
        teamId: resident.teamId,
      });
      if (result.created) alertsCreated++;
    }

    console.log(
      `[Medication Alerts] Created ${alertsCreated} new medication alerts for ${residentIds.size} residents`
    );

    return { alertsCreated, residentsChecked: residentIds.size };
  },
});
