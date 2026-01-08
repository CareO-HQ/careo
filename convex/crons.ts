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

/**
 * SEND CARE PLAN EVALUATION NOTIFICATIONS
 * Sends reminder notifications to nurses for care plans that need evaluation
 * Runs every 2 minutes to send reminders
 * - Starts immediately after care plan creation/update
 * - Sends notifications to nurses in the same team as the resident
 * - Shows days remaining until evaluation becomes overdue (30 days after creation)
 * - Stops when evaluation is completed or becomes overdue
 */
crons.interval(
  "Send care plan evaluation notifications",
  { minutes: 2 },
  internal.careFiles.carePlan.sendCarePlanEvaluationNotifications
);

/**
 * CHECK AND NOTIFY AUDIT REMINDERS
 * Checks for audits that are 15 days before due date or overdue
 * Runs daily to check for audits needing notifications
 * - Queries all completed audits with nextAuditDue set
 * - Sends notifications for audits 15 days before due date
 * - Sends overdue notifications for audits past their due date
 * - Only shows notifications to Managers
 * - Organization-wide visibility (not team-specific)
 */
crons.daily(
  "Check and notify audit reminders",
  {
    // London time: 08:00 - check for 15-day reminders and overdue audits
    hourUTC: 8,
    minuteUTC: 0
  },
  internal.auditNotifications.checkAndNotifyAuditReminders
);

/**
 * CLEANUP INVALID AUDIT NOTIFICATIONS (IMMEDIATE)
 * Removes invalid notifications immediately after updating days remaining
 * Runs every 2 minutes right after updating notifications
 * - Removes notifications for audits that are not completed
 * - Removes notifications for audits without valid nextAuditDue dates
 */
crons.interval(
  "Cleanup invalid audit notifications (2min)",
  { minutes: 2 },
  internal.auditNotifications.cleanupInvalidAuditNotifications
);

/**
 * CHECK AND NOTIFY EXPIRED AUDITS
 * Checks for audits that have passed their due date and generates expiry notifications
 * Runs daily at 9 AM to check for expired audits
 * - Queries all completed audits with nextAuditDue set
 * - Creates expiry notifications for audits where nextAuditDue <= now
 * - Only shows notifications to Managers
 * - Organization-wide visibility (not team-specific)
 */
crons.daily(
  "Check and notify expired audits",
  {
    // London time: 09:00 - check for expired audits
    hourUTC: 9,
    minuteUTC: 0
  },
  internal.auditNotifications.checkAndNotifyExpiredAudits
);

/**
 * CLEANUP INVALID AUDIT NOTIFICATIONS
 * Removes notifications for audits that are no longer completed or don't have valid nextAuditDue
 * Runs daily at 10 AM to clean up invalid notifications
 * - Removes notifications for audits that are not completed
 * - Removes notifications for audits without valid nextAuditDue dates
 * - Prevents showing stale notifications to Managers
 */
crons.daily(
  "Cleanup invalid audit notifications",
  {
    // London time: 10:00 - cleanup invalid notifications
    hourUTC: 10,
    minuteUTC: 0
  },
  internal.auditNotifications.cleanupInvalidAuditNotifications
);

export default crons;
