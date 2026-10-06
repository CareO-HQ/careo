import { describe, expect, it } from "vitest";
import { CreateResidentSchema, EditResidentSchema } from "@/schemas/CreateResidentSchema";
import { CreateMedicationSchema } from "@/schemas/medication/CreateMedicationSchema";
import { SignupFormSchema } from "@/schemas/auth/SignupFormSchema";
import { LoginFormSchema } from "@/schemas/auth/LoginFormSchema";
import { NewPasswordSchema } from "@/schemas/auth/NewPasswordSchema";
import { inviteMemberSchema } from "@/schemas/settings/inviteMemberSchema";
import { RefusedMedicationSchema } from "@/schemas/residents/medication/refusedMedicationSchema";
import { BloodMonitoringSchema } from "@/schemas/residents/medication/bloodMonitoringSchema";

const UUID = "3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

const validResident = {
  firstName: "Mary",
  lastName: "Jones",
  dateOfBirth: "1940-05-01",
  roomNumber: "12",
  admissionDate: "2026-01-10",
  teamId: "team-1",
  nhsHealthNumber: "9434765919", // valid Modulus-11 test number
  dependencies: {
    mobility: "Independent",
    eating: "Independent",
    dressing: "Assistance Needed",
    toileting: "Prompt Needed",
  },
} as const;

const validMedication = {
  name: "Paracetamol",
  strength: "500",
  strengthUnit: "mg",
  dosageForm: "Tablet",
  route: "Oral",
  frequency: "Twice daily (BD)",
  scheduleType: "Scheduled",
  times: ["08:00", "20:00"],
  startDate: new Date("2026-01-01"),
  status: "active",
  checkedByUserId: UUID,
} as const;

describe("CreateResidentSchema", () => {
  it("accepts a complete resident", () => {
    expect(CreateResidentSchema.safeParse(validResident).success).toBe(true);
  });

  it.each(["firstName", "lastName", "dateOfBirth", "roomNumber", "admissionDate", "teamId", "nhsHealthNumber"])(
    "rejects empty %s",
    (field) => {
      expect(CreateResidentSchema.safeParse({ ...validResident, [field]: "" }).success).toBe(false);
    }
  );

  it("rejects missing dependencies and invalid dependency level", () => {
    const { dependencies: _d, ...noDeps } = validResident;
    expect(CreateResidentSchema.safeParse(noDeps).success).toBe(false);
    expect(
      CreateResidentSchema.safeParse({ ...validResident, dependencies: { ...validResident.dependencies, eating: "Sometimes" } })
        .success
    ).toBe(false);
  });

  it("rejects risk with invalid level and allergy with empty name", () => {
    expect(CreateResidentSchema.safeParse({ ...validResident, risks: [{ risk: "Falls", level: "extreme" }] }).success).toBe(
      false
    );
    expect(CreateResidentSchema.safeParse({ ...validResident, allergies: [{ allergy: "" }] }).success).toBe(false);
  });

  it("BUG: accepts a non-date date of birth", () => {
    expect(CreateResidentSchema.safeParse({ ...validResident, dateOfBirth: "yesterday" }).success).toBe(false);
  });

  it("BUG: accepts a date of birth in the future", () => {
    expect(CreateResidentSchema.safeParse({ ...validResident, dateOfBirth: "2999-01-01" }).success).toBe(false);
  });

  it("BUG: accepts an admission date before the date of birth", () => {
    expect(
      CreateResidentSchema.safeParse({ ...validResident, dateOfBirth: "1990-01-01", admissionDate: "1980-01-01" }).success
    ).toBe(false);
  });

  it.each(["abc", "123", "9434765918" /* bad check digit */, "94347659190"])(
    "BUG: accepts invalid NHS number %s (no 10-digit / Modulus 11 check)",
    (nhs) => {
      expect(CreateResidentSchema.safeParse({ ...validResident, nhsHealthNumber: nhs }).success).toBe(false);
    }
  );

  it("BUG: accepts whitespace-only first name", () => {
    expect(CreateResidentSchema.safeParse({ ...validResident, firstName: "   " }).success).toBe(false);
  });

  it("EditResidentSchema allows blank optional fields but still requires names", () => {
    expect(EditResidentSchema.safeParse({ firstName: "A", lastName: "B", dateOfBirth: "1940-01-01" }).success).toBe(true);
    expect(EditResidentSchema.safeParse({ firstName: "", lastName: "B", dateOfBirth: "1940-01-01" }).success).toBe(false);
  });
});

describe("CreateMedicationSchema", () => {
  it("accepts a scheduled medication", () => {
    const r = CreateMedicationSchema.safeParse(validMedication);
    expect(r.error?.issues ?? []).toEqual([]);
  });

  it("scheduled medication requires times and frequency", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, times: [] }).success).toBe(false);
    expect(CreateMedicationSchema.safeParse({ ...validMedication, frequency: undefined }).success).toBe(false);
  });

  it("PRN does not require times but requires dosage unit", () => {
    const prn = { ...validMedication, scheduleType: "PRN (As Needed)", times: undefined, frequency: "Tablets/Capsules" };
    expect(CreateMedicationSchema.safeParse(prn).success).toBe(true);
    expect(CreateMedicationSchema.safeParse({ ...prn, frequency: undefined }).success).toBe(false);
  });

  it("topical requires body regions", () => {
    const topical = { ...validMedication, scheduleType: "Topical", route: "Topical", dosageForm: "Cream" };
    expect(CreateMedicationSchema.safeParse(topical).success).toBe(false);
    expect(CreateMedicationSchema.safeParse({ ...topical, bodyRegions: ["left_arm"] }).success).toBe(true);
  });

  it("requires a valid checked-by staff uuid", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, checkedByUserId: "me" }).success).toBe(false);
  });

  it("rejects non-positive limits and zero quantities", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, maxDailyDose: 0 }).success).toBe(false);
    expect(CreateMedicationSchema.safeParse({ ...validMedication, minIntervalHours: -1 }).success).toBe(false);
    expect(CreateMedicationSchema.safeParse({ ...validMedication, timeQuantities: { "08:00": 0 } }).success).toBe(false);
  });

  it("BUG: accepts a non-numeric strength", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, strength: "lots" }).success).toBe(false);
  });

  it("BUG: accepts invalid administration times like 25:99", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, times: ["25:99"] }).success).toBe(false);
  });

  it("BUG: accepts duplicate administration times", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, times: ["08:00", "08:00"] }).success).toBe(false);
  });

  it("BUG: accepts a controlled drug without a CD schedule", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, isControlledDrug: true }).success).toBe(false);
  });

  it("BUG: accepts a negative total stock count", () => {
    expect(CreateMedicationSchema.safeParse({ ...validMedication, totalCount: -5 }).success).toBe(false);
  });
});

describe("auth schemas", () => {
  it("login/signup require valid email and 8+ char password", () => {
    expect(LoginFormSchema.safeParse({ email: "a@b.co", password: "12345678" }).success).toBe(true);
    expect(LoginFormSchema.safeParse({ email: "nope", password: "12345678" }).success).toBe(false);
    expect(SignupFormSchema.safeParse({ name: "", email: "a@b.co", password: "12345678" }).success).toBe(false);
    expect(SignupFormSchema.safeParse({ name: "A", email: "a@b.co", password: "short" }).success).toBe(false);
  });

  it("BUG: new password policy comment says capital+number+special but only length is enforced", () => {
    expect(NewPasswordSchema.safeParse({ password: "aaaaaaaa" }).success).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  it.each(["owner", "saas_admin", "agency_nurse"])("cannot invite role %s through the form", (role) => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.co", role }).success).toBe(false);
  });

  it("allows staff roles", () => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.co", role: "kitchen_staff" }).success).toBe(true);
  });
});

describe("medication record schemas", () => {
  const refused = {
    residentId: UUID,
    organizationId: UUID,
    userId: UUID,
    date: Date.now(),
    medicationId: UUID,
    dose: "1",
    count: "1",
    reasonForRefused: "Declined",
    signature: "AB",
  };

  it("refused medication requires reason and signature", () => {
    expect(RefusedMedicationSchema.safeParse(refused).success).toBe(true);
    expect(RefusedMedicationSchema.safeParse({ ...refused, reasonForRefused: "" }).success).toBe(false);
    expect(RefusedMedicationSchema.safeParse({ ...refused, signature: "" }).success).toBe(false);
    expect(RefusedMedicationSchema.safeParse({ ...refused, residentId: "x" }).success).toBe(false);
  });

  const blood = {
    residentId: UUID,
    organizationId: UUID,
    date: Date.now(),
    time: "08:00",
    bloodSugar: "6.2",
    mealStatus: "Pre",
    insulinAdministered: false,
    signature1: "AB",
  };

  it("blood monitoring basic validation", () => {
    expect(BloodMonitoringSchema.safeParse(blood).success).toBe(true);
    expect(BloodMonitoringSchema.safeParse({ ...blood, signature1: "" }).success).toBe(false);
  });

  it("BUG: blood sugar accepts non-numeric values", () => {
    expect(BloodMonitoringSchema.safeParse({ ...blood, bloodSugar: "high-ish" }).success).toBe(false);
  });

  it("BUG: insulin administered without a second signature/site is accepted", () => {
    expect(BloodMonitoringSchema.safeParse({ ...blood, insulinAdministered: true }).success).toBe(false);
  });
});
