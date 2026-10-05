import { describe, expect, it } from "vitest";
import { isEligibleWitness } from "@/lib/medication/witness";

describe("medication witness eligibility", () => {
  it("offers other care staff", () => {
    for (const role of ["manager", "nurse", "care_assistant", "agency_nurse"]) {
      expect(isEligibleWitness({ userId: "other", role }, "me")).toBe(true);
    }
  });

  it("never offers the person administering", () => {
    expect(isEligibleWitness({ userId: "me", role: "nurse" }, "me")).toBe(false);
  });

  it("never offers the owner", () => {
    expect(isEligibleWitness({ userId: "owner-1", role: "owner" }, "me")).toBe(false);
  });
});
