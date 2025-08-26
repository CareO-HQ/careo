import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "Generate daily medicine intakes",
  {
    // London time: 12:00
    hourUTC: 11,
    minuteUTC: 0
  },
  internal.medication.dailyMedicationCron,
  {}
);

export default crons;
