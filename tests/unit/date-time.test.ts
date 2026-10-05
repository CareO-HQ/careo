import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatTimestampToUKDate,
  formatTimestampToUKDateTime,
  formatTimestampToUKTime,
  getLocalHour,
  getNearestMedicationTime,
  getUKTodayDate,
  getYesterdayDate,
  isDayShift,
  isNightShift,
} from "@/lib/date-utils";
import {
  formatIncidentTimeDisplay,
  incidentTime24hFromParts,
  incidentTimePartsFrom24h,
} from "@/lib/incident-time-utils";
import { formatRelativeTime, getTimeDifference } from "@/lib/utils/dateUtils";
import {
  checkGracePeriod,
  getCurrentShift,
  getShiftForDate,
  getShiftTimeRange,
  shouldAutoArchiveDayShift,
} from "@/lib/config/shift-config";

afterEach(() => {
  vi.useRealTimers();
});

describe("date-utils: UK timezone handling (GMT/BST)", () => {
  it("formats winter (GMT) timestamps unchanged", () => {
    expect(formatTimestampToUKTime("2026-01-15T09:30:00Z")).toBe("09:30");
  });

  it("formats summer (BST) timestamps +1h", () => {
    expect(formatTimestampToUKTime("2026-07-15T09:30:00Z")).toBe("10:30");
  });

  it("handles the spring-forward boundary (29 Mar 2026 01:00 UTC)", () => {
    expect(formatTimestampToUKTime("2026-03-29T00:59:00Z")).toBe("00:59");
    expect(formatTimestampToUKTime("2026-03-29T01:00:00Z")).toBe("02:00");
  });

  it("handles the fall-back boundary (25 Oct 2026 01:00 UTC)", () => {
    expect(formatTimestampToUKTime("2026-10-25T00:30:00Z")).toBe("01:30");
    expect(formatTimestampToUKTime("2026-10-25T01:30:00Z")).toBe("01:30");
  });

  it("UK date rolls over at UK midnight, not UTC midnight", () => {
    // 23:30 UTC on 30 June = 00:30 BST on 1 July
    expect(formatTimestampToUKDate("2026-06-30T23:30:00Z")).toBe("2026-07-01");
  });

  it("accepts epoch ms numbers and numeric strings", () => {
    const ms = Date.UTC(2026, 0, 1, 12, 0);
    expect(formatTimestampToUKTime(ms)).toBe("12:00");
    expect(formatTimestampToUKTime(String(ms))).toBe("12:00");
  });

  it("returns '--' for null/undefined/garbage instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(formatTimestampToUKTime(null)).toBe("--");
    expect(formatTimestampToUKTime(undefined)).toBe("--");
    expect(formatTimestampToUKTime("not a date")).toBe("--");
    expect(formatTimestampToUKDateTime(Number.NaN)).toBe("--");
    spy.mockRestore();
  });

  it("formatTimestampToUKDate throws on invalid input (callers must guard)", () => {
    expect(() => formatTimestampToUKDate("garbage")).toThrow();
  });

  it("getUKTodayDate uses UK date at 23:30 UTC in summer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T23:30:00Z"));
    expect(getUKTodayDate()).toBe("2026-07-11");
  });

  it.each([
    ["2026-01-10T07:59:00Z", "night"],
    ["2026-01-10T08:00:00Z", "day"],
    ["2026-01-10T19:59:00Z", "day"],
    ["2026-01-10T20:00:00Z", "night"],
    ["2026-07-10T07:00:00Z", "day"], // 08:00 BST
    ["2026-07-10T19:00:00Z", "night"], // 20:00 BST
  ])("isDayShift/isNightShift at %s -> %s", (ts, shift) => {
    expect(isDayShift(ts)).toBe(shift === "day");
    expect(isNightShift(ts)).toBe(shift === "night");
  });

  it("getLocalHour returns 0 at UK midnight (not 24)", () => {
    expect(getLocalHour("2026-01-10T00:00:00Z")).toBe(0);
  });

  it("getYesterdayDate crosses month/year/leap boundaries", () => {
    expect(getYesterdayDate("2026-03-01")).toBe("2026-02-28");
    expect(getYesterdayDate("2028-03-01")).toBe("2028-02-29");
    expect(getYesterdayDate("2026-01-01")).toBe("2025-12-31");
  });
});

describe("date-utils: getNearestMedicationTime", () => {
  it("returns null for no times", () => {
    expect(getNearestMedicationTime([])).toBeNull();
  });

  it("picks the closest slot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T13:10:00Z"));
    expect(getNearestMedicationTime(["08:00", "12:00", "18:00"])).toBe("12:00");
  });

  it("BUG: does not wrap around midnight (23:50 should pick 00:00, not 20:00)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T23:50:00Z"));
    expect(getNearestMedicationTime(["00:00", "08:00", "20:00"])).toBe("00:00");
  });
});

describe("incident-time-utils", () => {
  it.each([
    ["00:00", { hour: "12", minute: "00", period: "AM" }],
    ["00:05", { hour: "12", minute: "05", period: "AM" }],
    ["11:59", { hour: "11", minute: "59", period: "AM" }],
    ["12:00", { hour: "12", minute: "00", period: "PM" }],
    ["13:45", { hour: "1", minute: "45", period: "PM" }],
    ["23:59", { hour: "11", minute: "59", period: "PM" }],
    ["7:05", { hour: "7", minute: "05", period: "AM" }],
  ])("parses %s", (value, parts) => {
    expect(incidentTimePartsFrom24h(value)).toEqual(parts);
  });

  it("round-trips every minute of the day", () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        expect(incidentTime24hFromParts(incidentTimePartsFrom24h(v))).toBe(v);
      }
    }
  });

  it("falls back to provided date for malformed input", () => {
    const fallback = new Date(2026, 0, 1, 15, 7);
    expect(incidentTimePartsFrom24h("abc", fallback)).toEqual({ hour: "3", minute: "07", period: "PM" });
    expect(incidentTimePartsFrom24h(undefined, fallback)).toEqual({ hour: "3", minute: "07", period: "PM" });
  });

  it("BUG: accepts out-of-range minutes such as 10:99 instead of rejecting/falling back", () => {
    expect(incidentTimePartsFrom24h("10:99").minute).not.toBe("99");
  });

  it("formats display and empty input", () => {
    expect(formatIncidentTimeDisplay("18:30")).toBe("6:30 PM");
    expect(formatIncidentTimeDisplay("")).toBe("");
    expect(formatIncidentTimeDisplay("   ")).toBe("");
  });

  it("invalid hour in parts defaults to 12", () => {
    expect(incidentTime24hFromParts({ hour: "0", minute: "15", period: "AM" })).toBe("00:15");
    expect(incidentTime24hFromParts({ hour: "x", minute: "15", period: "PM" })).toBe("12:15");
  });
});

describe("utils/dateUtils: relative time", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it.each([
    [5_000, "just now"],
    [30_000, "30 seconds ago"],
    [MIN, "1 minute ago"],
    [2 * HOUR, "2 hours ago"],
    [2 * HOUR + 5 * MIN, "2 hours and 5 minutes ago"],
    [3 * DAY + 2 * HOUR, "3 days and 2 hours ago"],
    [8 * DAY, "1 week and 1 day ago"],
  ])("%i ms ago -> %s", (ms, text) => {
    expect(formatRelativeTime(ago(ms), now)).toBe(text);
  });

  it("future dates use 'from now'", () => {
    expect(formatRelativeTime(new Date(now.getTime() + 2 * HOUR), now)).toBe("2 hours from now");
  });

  it("BUG: 30 days ago is reported as '2 days ...' (weeks % 4 wraps to 0)", () => {
    expect(formatRelativeTime(ago(30 * DAY), now)).not.toMatch(/^2 days/);
  });

  it("BUG: 28 days ago is reported as '0 weeks'/'just now' style output", () => {
    const diff = getTimeDifference(ago(28 * DAY), now);
    // 28 days is 4 weeks and 0 months; every unit of the breakdown is zero
    expect(diff.weeks + diff.months + diff.days).toBeGreaterThan(0);
  });
});

describe("shift-config", () => {
  it("time range labels", () => {
    expect(getShiftTimeRange("day")).toBe("8AM - 8PM");
    expect(getShiftTimeRange("night")).toBe("8PM - 8AM");
  });

  it.each([
    ["2026-01-10T00:00:00Z", "night"],
    ["2026-01-10T00:30:00Z", "night"],
    ["2026-01-10T08:00:00Z", "day"],
    ["2026-01-10T20:00:00Z", "night"],
    ["2026-07-10T07:30:00Z", "day"],
  ])("getShiftForDate(%s) -> %s", (iso, shift) => {
    expect(getShiftForDate(new Date(iso))).toBe(shift);
  });

  it("getCurrentShift follows the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T10:00:00Z"));
    expect(getCurrentShift()).toBe("day");
    vi.setSystemTime(new Date("2026-01-10T22:00:00Z"));
    expect(getCurrentShift()).toBe("night");
  });

  it("grace period after day shift and night shift", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T20:30:00Z"));
    expect(checkGracePeriod()).toEqual({ inGracePeriod: true, shiftToArchive: "day", minutesRemaining: 30 });
    vi.setSystemTime(new Date("2026-01-10T08:59:00Z"));
    expect(checkGracePeriod()).toEqual({ inGracePeriod: true, shiftToArchive: "night", minutesRemaining: 1 });
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    expect(checkGracePeriod()).toEqual({ inGracePeriod: false });
  });

  it("auto-archive only during the 21:00 UK hour (BST aware)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T20:15:00Z")); // 21:15 BST
    expect(shouldAutoArchiveDayShift()).toBe(true);
    vi.setSystemTime(new Date("2026-07-10T21:15:00Z")); // 22:15 BST
    expect(shouldAutoArchiveDayShift()).toBe(false);
  });
});
