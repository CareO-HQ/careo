import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "Generate daily medicine intakes",
  {
    // London time: 00:00
    hourUTC: 0,
    minuteUTC: 0
  },
  internal.medication.dailyMedicationCron
);

crons.daily(
  "Archive previous day food/fluid logs",
  {
    // London time: 07:00 - archive previous day's logs
    hourUTC: 7,
    minuteUTC: 0
  },
  internal.foodFluidLogs.archivePreviousDayLogs,
  {}
);

crons.daily(
  "Generate night care reports",
  {
    // London time: 08:00 - generate night reports (8 PM - 8 AM)
    hourUTC: 8,
    minuteUTC: 0
  },
  internal.personalCare.generateNightReports
);

crons.daily(
  "Generate day care reports",
  {
    // London time: 20:00 - generate day reports (8 AM - 8 PM)
    hourUTC: 20,
    minuteUTC: 0
  },
  internal.personalCare.generateDayReports
);

/**
 * AUTO-ARCHIVE OLD FOOD/FLUID LOGS (6+ months)
 * Prevents database bloat and keeps queries fast
 * Runs at 2 AM daily to archive logs older than 6 months
 */
crons.daily(
  "Auto-archive old food/fluid logs",
  {
    // London time: 02:00 - archive logs older than 6 months
    hourUTC: 2,
    minuteUTC: 0
  },
  internal.foodFluidLogs.autoArchiveOldLogs
);

/**
 * CHECK CARE PLAN REMINDERS
 * Checks for care plans due for review (30 days after creation)
 * Compares dates only (ignoring time component)
 * Runs at 6 AM daily to notify staff at start of day
 */
crons.daily(
  "Check care plan reminders",
  {
    // London time: 06:00 - check for care plans due for review
    hourUTC: 6,
    minuteUTC: 0
  },
  internal.careFiles.carePlan.checkCarePlanReminders
);

/**
 * UPDATE OVERDUE ACTION PLANS
 * Updates action plan status to "overdue" and sends notifications
 * Runs at 1 AM daily to mark overdue plans before staff start work
 */
crons.daily(
  "Update overdue action plans",
  {
    // London time: 01:00 - update overdue action plans
    hourUTC: 1,
    minuteUTC: 0
  },
  internal.auditActionPlans.updateOverdueActionPlans
);

/**
 * CLEAN UP OLD DRAFT RESPONSES
 * Deletes draft audit responses older than 30 days with no data
 * Prevents database bloat from abandoned audits
 * Runs weekly on Sunday at 3 AM
 */
crons.weekly(
  "Clean up old draft responses",
  {
    // Sunday at 3 AM London time
    dayOfWeek: "sunday",
    hourUTC: 3,
    minuteUTC: 0
  },
  internal.auditResponses.cleanupOldDrafts
);

/**
 * ARCHIVE OLD COMPLETED ACTION PLANS
 * Deletes completed action plans older than 90 days
 * Keeps database size manageable for long-term use
 * Runs weekly on Sunday at 4 AM
 */
crons.weekly(
  "Archive old completed action plans",
  {
    // Sunday at 4 AM London time
    dayOfWeek: "sunday",
    hourUTC: 4,
    minuteUTC: 0
  },
  internal.auditActionPlans.archiveOldActionPlans
);

/**
 * ARCHIVE OLD READ NOTIFICATIONS
 * Deletes read notifications older than 90 days
 * Keeps notification queries fast and database clean
 * Runs weekly on Sunday at 5 AM
 */
crons.weekly(
  "Archive old read notifications",
  {
    // Sunday at 5 AM London time
    dayOfWeek: "sunday",
    hourUTC: 5,
    minuteUTC: 0
  },
  internal.notifications.archiveOldNotifications
);

/**
 * GENERATE FOOD/FLUID ALERTS
 * Checks for missing food/fluid logs and generates alerts
 * Runs every hour at the top of the hour
 * - Morning alerts: Generated after 12 PM if no morning log
 * - Afternoon alerts: Generated after 6 PM if no afternoon log
 * - Evening alerts: Generated after 10 PM if no evening log
 * - Night alerts: Generated after 6 AM if no night log
 */
crons.interval(
  "Generate food/fluid alerts",
  { hours: 1 },
  internal.alertGeneration.generateFoodFluidAlerts
);

/**
 * GENERATE NIGHT CHECK ALERTS
 * Checks for overdue night checks and generates alerts
 * Runs every hour at the top of the hour
 * - Positioning: Alerts if overdue by 15+ minutes
 * - Bed rails: Alerts if not checked during night shift
 * - Night check: Alerts if not completed during night shift
 * - Pad change: Alerts if overdue by 30+ minutes
 */
crons.interval(
  "Generate night check alerts",
  { hours: 1 },
  internal.alertGeneration.generateNightCheckAlerts
);

/**
 * GENERATE MEDICATION ALERTS
 * Checks for due soon, overdue, and missed medications
 * Runs every 15 minutes for timely notifications
 * - Due Soon (Info): Medication scheduled within next 30 minutes
 * - Overdue (Critical): Medication past scheduled time by 15+ minutes
 * - Missed (Warning): Medication marked as missed state
 */
crons.interval(
  "Generate medication alerts",
  { minutes: 15 },
  internal.alertGeneration.generateMedicationAlerts
);

export default crons;
