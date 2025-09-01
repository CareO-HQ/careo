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

export default crons;
