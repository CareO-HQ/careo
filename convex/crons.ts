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

export default crons;
