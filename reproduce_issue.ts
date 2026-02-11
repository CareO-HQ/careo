
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const UK_TIMEZONE = "Europe/London";

function testLogic(scenario: string, userNowDate: Date, selectedStartDate: Date) {
    console.log(`\n--- ${scenario} ---`);
    console.log("User Now (Browser):", userNowDate.toString());
    console.log("Selected Start Date:", selectedStartDate.toString());

    // Logic from CreateMedicationForm matches this:

    // 1. Get current time in UK logic
    const now = userNowDate;
    const ukNow = toZonedTime(now, UK_TIMEZONE);
    const ukTodayStr = format(ukNow, "yyyy-MM-dd");
    console.log("ukTodayStr:", ukTodayStr);

    // 2. Get start date string
    const startDateStr = format(selectedStartDate, "yyyy-MM-dd");
    console.log("startDateStr:", startDateStr);

    // 3. Comparison
    const isStarted = startDateStr <= ukTodayStr;
    console.log("isStarted:", isStarted);

    if (isStarted) {
        const time = "08:00";
        const dateTimeStr = `${ukTodayStr}T${time}:00`;
        const scheduledTimeUTC = fromZonedTime(dateTimeStr, UK_TIMEZONE);
        console.log("Generated Intake Time (UTC):", scheduledTimeUTC.toISOString());
    } else {
        console.log("No intakes generated.");
    }
}

// Scenario 1: User in India (UTC+5:30), creating for Today
const indiaNow = new Date("2024-02-11T21:00:00+05:30");
const indiaSelectedDate = new Date("2024-02-11T00:00:00+05:30");
testLogic("India Normal", indiaNow, indiaSelectedDate);

// Scenario 2: User in US (UTC-5), creating for Today
const usNow = new Date("2024-02-11T10:00:00-05:00");
const usSelectedDate = new Date("2024-02-11T00:00:00-05:00");
testLogic("US Normal", usNow, usSelectedDate);

// Scenario 3: User in US (Late Night), creating for Today
// Real time: Feb 10, 22:00 EST -> Feb 11, 03:00 GMT (UK is next day relative to user)
const usLateNow = new Date("2024-02-10T22:00:00-05:00");
const usLateSelectedDate = new Date("2024-02-10T00:00:00-05:00");
testLogic("US Late Night", usLateNow, usLateSelectedDate);

// Scenario 4: User in India (Early Morning), creating for Today
// Real time: Feb 12, 02:00 IST -> Feb 11, 20:30 GMT (UK is previous day relative to user)
const indiaEarlyNow = new Date("2024-02-12T02:00:00+05:30");
const indiaEarlySelectedDate = new Date("2024-02-12T00:00:00+05:30");
testLogic("India Early Morning", indiaEarlyNow, indiaEarlySelectedDate);
