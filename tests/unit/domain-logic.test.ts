import { describe, expect, it, vi } from "vitest";
import {
  computeFoodFluidComplianceInWindow,
  isFluidLogEntry,
  isQualifyingFoodLog,
} from "@/lib/food-fluid-log-classification";
import {
  CARE_FILE_STATUS_CYCLE,
  coerceCareFileCompletionItem,
  isCareFileItemReviewed,
  nextCareFileItemStatus,
  normalizeCareFileItemStatus,
  persistCareFileItemStatus,
} from "@/lib/care-file-audit";
import {
  compareAuditSectionNumbers,
  findInsertIndexForNewSection,
  getParentSectionNumber,
  isSectionNumberUnderPrefix,
  reorderAuditSectionHierarchy,
} from "@/lib/audit-section-number";
import {
  buildChecksIntervalAlertMessage,
  buildChecksIntervalAlertTitle,
} from "@/lib/checks-interval-alerts";
import { isLiquidDosageForm } from "@/lib/medication/liquid-helpers";
import { formatRoleName, getAge, getColorForBadge } from "@/lib/utils";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const { checkFileSecurity } = await import("@/lib/files/checkFileSecurity");

describe("food/fluid compliance", () => {
  it("fluid detection by volume or drink type", () => {
    expect(isFluidLogEntry({ fluid_consumed_ml: 150 })).toBe(true);
    expect(isFluidLogEntry({ type_of_food_drink: "Tea" })).toBe(true);
    expect(isFluidLogEntry({ type_of_food_drink: "Sandwich", amount_eaten: "All" })).toBe(false);
    expect(isFluidLogEntry({ fluid_consumed_ml: 0, type_of_food_drink: "Soup" })).toBe(false);
  });

  it("food requires a non-'none' amount and must not be a drink", () => {
    expect(isQualifyingFoodLog({ type_of_food_drink: "Porridge", amount_eaten: "Half" })).toBe(true);
    expect(isQualifyingFoodLog({ type_of_food_drink: "Porridge", amount_eaten: "None" })).toBe(false);
    expect(isQualifyingFoodLog({ type_of_food_drink: "Porridge", amount_eaten: "  " })).toBe(false);
    expect(isQualifyingFoodLog({ type_of_food_drink: "Tea", amount_eaten: "All" })).toBe(false);
  });

  it("window compliance", () => {
    expect(computeFoodFluidComplianceInWindow([])).toEqual({ foodOk: false, fluidOk: false });
    expect(
      computeFoodFluidComplianceInWindow([
        { type_of_food_drink: "Water" },
        { type_of_food_drink: "Toast", amount_eaten: "All" },
      ])
    ).toEqual({ foodOk: true, fluidOk: true });
  });

  it("BUG: refused drink (0 ml water) still counts as fluid intake", () => {
    expect(isFluidLogEntry({ type_of_food_drink: "Water", fluid_consumed_ml: 0 })).toBe(false);
  });

  it("BUG: common drinks with whitespace/qualifiers are not recognised as fluid", () => {
    expect(isFluidLogEntry({ type_of_food_drink: "Water " })).toBe(true);
    expect(isFluidLogEntry({ type_of_food_drink: "Orange juice" })).toBe(true);
  });
});

describe("care-file audit status", () => {
  it.each([
    [undefined, "not-reviewed"],
    ["", "not-reviewed"],
    ["unchecked", "not-reviewed"],
    ["checked", "compliant"],
    ["Compliant", "compliant"],
    ["action_required", "action-required"],
    ["Non Compliant", "non-compliant"],
    ["non‑compliant", "non-compliant"],
    ["N/A", "not-applicable"],
    ["garbage", "not-reviewed"],
  ])("normalize %j -> %s", (raw, expected) => {
    expect(normalizeCareFileItemStatus(raw as string | undefined)).toBe(expected);
  });

  it("status cycle visits every status and wraps", () => {
    let s = CARE_FILE_STATUS_CYCLE[0];
    const seen = new Set<string>();
    for (let i = 0; i < CARE_FILE_STATUS_CYCLE.length; i++) {
      seen.add(s);
      s = nextCareFileItemStatus(s);
    }
    expect(seen.size).toBe(CARE_FILE_STATUS_CYCLE.length);
    expect(s).toBe(CARE_FILE_STATUS_CYCLE[0]);
  });

  it("persist/normalize round-trip", () => {
    for (const st of CARE_FILE_STATUS_CYCLE) {
      expect(normalizeCareFileItemStatus(persistCareFileItemStatus(st))).toBe(st);
    }
  });

  it("coerces snake_case and camelCase rows, rejects bad rows", () => {
    expect(coerceCareFileCompletionItem(null)).toBeNull();
    expect(coerceCareFileCompletionItem({ itemName: "x" })).toBeNull();
    expect(coerceCareFileCompletionItem({ item_id: "a", item_name: "A", status: "checked" })).toEqual({
      itemId: "a",
      itemName: "A",
      status: "compliant",
      notes: undefined,
      date: undefined,
    });
    expect(isCareFileItemReviewed("")).toBe(false);
    expect(isCareFileItemReviewed("N/A")).toBe(true);
  });
});

describe("audit section numbering", () => {
  it("numeric (not lexical) ordering", () => {
    const nums = ["10", "2", "3.10", "3.2", "3", "3.1.1"];
    expect([...nums].sort(compareAuditSectionNumbers)).toEqual(["2", "3", "3.1.1", "3.2", "3.10", "10"]);
  });

  it("parent and prefix helpers", () => {
    expect(getParentSectionNumber("5.1.2")).toBe("5.1");
    expect(getParentSectionNumber("5")).toBeNull();
    expect(isSectionNumberUnderPrefix("5.1", "5")).toBe(true);
    expect(isSectionNumberUnderPrefix("51", "5")).toBe(false);
  });

  it("hierarchy reorder keeps children under parents and orphans at the end", () => {
    const out = reorderAuditSectionHierarchy([
      { id: "c", number: "2.1", parentId: "b" },
      { id: "b", number: "2" },
      { id: "a", number: "1" },
      { id: "o", number: "9.9", parentId: "missing" },
    ]);
    expect(out.map((s) => s.id)).toEqual(["a", "b", "c", "o"]);
  });

  it("insert index for top-level and nested sections", () => {
    const rows = [
      { isSection: true, sectionNumber: "1" },
      { isSection: false },
      { isSection: true, sectionNumber: "3" },
      { isSection: false },
      { isSection: true, sectionNumber: "3.1" },
      { isSection: false },
    ];
    expect(findInsertIndexForNewSection(rows, "2")).toBe(2);
    expect(findInsertIndexForNewSection(rows, "4")).toBe(6);
    expect(findInsertIndexForNewSection(rows, "3.2")).toBe(6);
    expect(findInsertIndexForNewSection(rows, "7.1")).toBe(-1);
    expect(findInsertIndexForNewSection(rows, "7.1", { fallbackTopLevelWhenParentRowMissing: true })).toBe(6);
  });
});

describe("check interval alerts", () => {
  it("title and message", () => {
    expect(buildChecksIntervalAlertTitle("night_check")).toBe("Night Check check overdue");
    expect(
      buildChecksIntervalAlertMessage({
        residentName: "Ann",
        checkType: "positional_change",
        frequencyMinutes: 120,
        overdueByMinutes: 135,
      })
    ).toBe("Positional Change check for Ann is overdue by 2h 15m. Expected every 120 minutes.");
    expect(
      buildChecksIntervalAlertMessage({ residentName: "Ann", checkType: "x", frequencyMinutes: 60, overdueByMinutes: 45 })
    ).toContain("overdue by 45m");
  });
});

describe("misc utils", () => {
  it("liquid dosage forms", () => {
    expect(isLiquidDosageForm("syrup")).toBe(true);
    expect(isLiquidDosageForm("Tablet")).toBe(false);
    expect(isLiquidDosageForm(null)).toBe(false);
  });

  it("formatRoleName", () => {
    expect(formatRoleName("agency_care_assistant")).toBe("Agency Care Assistant");
    expect(formatRoleName("RQIA")).toBe("Rqia");
  });

  it("getColorForBadge is deterministic", () => {
    expect(getColorForBadge("abc")).toBe(getColorForBadge("abc"));
    expect(getColorForBadge("")).toMatch(/^bg-/);
  });

  it("getAge before/after birthday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(getAge("1940-06-16")).toBe(85);
    expect(getAge("1940-06-15")).toBe(86);
    log.mockRestore();
    vi.useRealTimers();
  });

  it("BUG: getAge logs the resident's date of birth to the console (PII leak in browser logs)", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    getAge("1940-06-16");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("BUG: getAge returns NaN for an invalid date instead of failing loudly", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    expect(Number.isNaN(getAge("not-a-date"))).toBe(false);
  });
});

describe("file upload security (checkFileSecurity)", () => {
  const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

  it.each(["report.pdf", "photo.jpg", "scan.png", "notes.docx"])("allows %s", (name) => {
    expect(checkFileSecurity(file(name))).toBe(true);
  });

  it.each(["x.php", "x.html", "run.exe", "a.bat", "s.sh", "p.ps1", "~temp.pdf"])("blocks %s", (name) => {
    expect(checkFileSecurity(file(name))).toBe(false);
  });

  it("blocks files over 5MB", () => {
    expect(checkFileSecurity(file("big.pdf", 5 * 1024 * 1024 + 1))).toBe(false);
  });

  it.each(["shell.PHP", "page.HTML", "virus.EXE", "x.Bat"])("BUG: extension check is case-sensitive, allows %s", (name) => {
    expect(checkFileSecurity(file(name))).toBe(false);
  });

  it.each(["xss.svg", "page.xhtml", "shell.phtml", "shell.php5", "x.js", "x.vbs", "x.msi"])(
    "BUG: dangerous type %s is not on the block-list (block-list instead of allow-list)",
    (name) => {
      expect(checkFileSecurity(file(name))).toBe(false);
    }
  );
});
