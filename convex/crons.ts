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
  internal.foodFluidLogs.archivePreviousDayLogs
);

export default crons;
