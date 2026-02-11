
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";

const UK_TIMEZONE = "Europe/London";

function getUKTodayDate(nowDate) {
    return formatInTimeZone(nowDate, UK_TIMEZONE, 'yyyy-MM-dd');
}

function testFix(scenario, userNowDate, selectedStartDate) {
    console.log(`\n--- ${scenario} (FIXED LOGIC) ---`);
    console.log("User Now (Browser):", userNowDate.toString());

    // 1. Get current time in UK logic (USING NEW LOGIC)
    const ukTodayStr = getUKTodayDate(userNowDate);
    console.log("ukTodayStr:", ukTodayStr);

    // 2. Get start date string
    const startDateStr = format(selectedStartDate, "yyyy-MM-dd");
    console.log("startDateStr:", startDateStr);

    // 3. Comparison
    const isStarted = startDateStr <= ukTodayStr;
    console.log("isStarted:", isStarted);
}

// Scenario 1: India Normal
const indiaNow = new Date("2024-02-11T21:00:00+05:30");
// UK is Feb 11 15:30. ukTodayStr = "2024-02-11".
// Selected Start = Feb 11.
const indiaSelectedDate = new Date("2024-02-11T00:00:00+05:30");
testFix("India Normal", indiaNow, indiaSelectedDate);

// Scenario 4: India Early Morning (The problematic one)
// User Local: Feb 12 02:00.
// UK Time: Feb 11 20:30.
// ukTodayStr SHOULD BE "2024-02-11".
// User Selected Date: Feb 12 (Today for them).
// startDateStr = "2024-02-12".
const indiaEarlyNow = new Date("2024-02-12T02:00:00+05:30");
const indiaEarlySelectedDate = new Date("2024-02-12T00:00:00+05:30");
testFix("India Early Morning", indiaEarlyNow, indiaEarlySelectedDate);

// With the "Always Use UK Time" rule:
// If ukTodayStr is "2024-02-11".
// And user picked "2024-02-12".
// isStarted is FALSE.
// THIS IS CORRECT behavior for "Always Use UK Time". 
// The medication is scheduled for TOMORROW (UK Time).
// It should NOT show up in TODAY'S Medication (which is Feb 11).

// However, if the user picked "Feb 11" (Yesterday for them, Today for UK).
const indiaEarlySelectedConfused = new Date("2024-02-11T00:00:00+05:30");
testFix("India Early Morning - User Picks 'Yesterday'", indiaEarlyNow, indiaEarlySelectedConfused);
// This should be true.
