import type { HospitalPassportFormData } from "@/app/(dashboard)/dashboard/residents/[id]/(pages)/hospital-transfer/types";
import { format } from "date-fns";

type UnknownRecord = Record<string, unknown>;

export interface PrefillMedicationRow {
  name: string;
  strength?: string | null;
  dosage_form?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  status?: string | null;
}

export interface PrefillDietInformation {
  allergies?: string | null;
  dietaryRequirements?: string | null;
  textureGrade?: string | null;
  fluidConsistency?: string | null;
  likes?: string | null;
  dislikes?: string | null;
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function formatHealthConditions(healthConditions: unknown): string {
  if (!Array.isArray(healthConditions) || healthConditions.length === 0) return "";
  return healthConditions
    .map((hc) => {
      if (typeof hc === "string") return hc;
      if (hc && typeof hc === "object" && "condition" in hc) {
        return pickString((hc as UnknownRecord).condition);
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function formatRisks(risks: unknown): string {
  if (!Array.isArray(risks) || risks.length === 0) return "";
  return risks
    .map((r) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object") {
        const o = r as UnknownRecord;
        return pickString(o.label) || pickString(o.name) || pickString(o.type) || pickString(o.risk);
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function primaryEmergencyContact(resident: UnknownRecord): {
  name: string;
  address: string;
  phone: string;
} {
  const contacts = resident.emergencyContacts as
    | { name?: string; address?: string; phoneNumber?: string; isPrimary?: boolean }[]
    | undefined;
  const c = contacts?.find((x) => x.isPrimary) || contacts?.[0];
  return {
    name: c?.name?.trim() || pickString(resident.nextOfKinName),
    address: c?.address?.trim() || pickString(resident.nextOfKinAddress),
    phone: c?.phoneNumber?.trim() || pickString(resident.nextOfKinPhone),
  };
}

function formatDietSummary(diet: PrefillDietInformation | null): string {
  if (!diet) return "";
  return [
    pickString(diet.dietaryRequirements),
    pickString(diet.textureGrade),
    pickString(diet.fluidConsistency),
    pickString(diet.likes),
    pickString(diet.dislikes),
  ]
    .filter(Boolean)
    .join(". ");
}

export function formatMedicationRegime(medications: PrefillMedicationRow[]): string {
  const active = medications.filter((m) => (m.status ?? "active") === "active");
  if (active.length === 0) {
    return "";
  }
  return active
    .map((m) => {
      const label = [m.name, m.strength, m.dosage_form].filter(Boolean).join(" ");
      const freq = m.frequency ? ` — ${m.frequency}` : "";
      const inst = m.instructions ? `. ${m.instructions}` : "";
      return `• ${label}${freq}${inst}`;
    })
    .join("\n");
}

function formatDobForInput(dob: unknown): string {
  if (!dob) return "";
  if (typeof dob === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(dob)) return dob.slice(0, 10);
    return dob;
  }
  return "";
}

export interface BuildHospitalPassportPrefillInput {
  resident: UnknownRecord;
  profile?: UnknownRecord | null;
  dietInformation: PrefillDietInformation | null;
  medications: PrefillMedicationRow[];
  bodyMapsCount: number;
  defaultCareHomeName: string;
  initialData?: Partial<HospitalPassportFormData> | null;
  isEditing: boolean;
}

function stripUndefined<T extends object>(obj: T | undefined | null): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Builds default `values` for the hospital passport form: resident record, diet, meds, body maps,
 * then optional `initialData` when editing an existing passport.
 */
export function buildHospitalPassportFormValues(input: BuildHospitalPassportPrefillInput): HospitalPassportFormData {
  const { resident, profile, dietInformation, medications, bodyMapsCount, defaultCareHomeName, initialData, isEditing } =
    input;

  const teamNested = resident.teams as { name?: string } | { name?: string }[] | undefined;
  const teamName = Array.isArray(teamNested) ? teamNested[0]?.name : teamNested?.name;

  const first = pickString(resident.firstName) || pickString(resident.first_name);
  const middle = pickString(resident.middleName) || pickString(resident.middle_name);
  const last = pickString(resident.lastName) || pickString(resident.last_name);
  const personName = [first, middle, last].filter(Boolean).join(" ").trim() || pickString(resident.name);
  const knownAs = first || personName;
  const dob =
    formatDobForInput(resident.dateOfBirth) ||
    formatDobForInput(resident.date_of_birth) ||
    formatDobForInput(resident.dob);
  const nhs =
    pickString(resident.nhsHealthNumber) || pickString(resident.nhs_health_number) || pickString(resident.nhsNumber);
  const religion = pickString(resident.religion);
  const room = pickString(resident.room_number) || pickString(resident.roomNumber);
  const status = pickString(resident.status);

  const gpName = pickString(resident.gpName) || pickString(resident.gp_name);
  const gpAddress = pickString(resident.gpAddress) || pickString(resident.gp_address);
  const gpPhone = pickString(resident.gpPhone) || pickString(resident.gp_phone);

  const careManagerName = pickString(resident.careManagerName) || pickString(resident.care_manager_name);
  const careManagerAddress = pickString(resident.careManagerAddress) || pickString(resident.care_manager_address);
  const careManagerPhone = pickString(resident.careManagerPhone) || pickString(resident.care_manager_phone);

  const nok = primaryEmergencyContact(resident);
  const nokName = nok.name;
  const nokAddress = nok.address;
  const nokPhone = nok.phone;

  const pastMedical =
    formatHealthConditions(resident.health_conditions) || pickString(resident.medical_history);
  const dietAllergies = [pickString(resident.allergies), dietInformation?.allergies ? pickString(dietInformation.allergies) : ""]
    .filter(Boolean)
    .join("; ");
  const knownAllergies = dietAllergies;

  const dietSummary = formatDietSummary(dietInformation);
  const risksText = formatRisks(resident.risks);

  const situation = [personName, defaultCareHomeName, teamName, room, status]
    .map((s) => pickString(s))
    .filter(Boolean)
    .join(". ");

  const background = [pastMedical, dietSummary, pickString(resident.phone_number)]
    .filter(Boolean)
    .join(". ");

  const assessment = [risksText, knownAllergies].filter(Boolean).join(". ");

  const recommendations = "";

  const medRegime = formatMedicationRegime(medications);
  const skinState = "";

  const nowSlice = new Date().toISOString().slice(0, 16);

  const prefill: HospitalPassportFormData = {
    generalDetails: {
      personName,
      knownAs,
      dateOfBirth: dob,
      nhsNumber: nhs,
      religion,
      weightOnTransfer: "",
      careType: "residential",
      transferDateTime: nowSlice,
      accompaniedBy: "",
      englishFirstLanguage: "yes",
      firstLanguage: "",
      careHomeName: defaultCareHomeName,
      careHomeAddress: "",
      careHomePhone: "",
      hospitalName: "",
      hospitalAddress: "",
      hospitalPhone: "",
      nextOfKinName: nokName,
      nextOfKinAddress: nokAddress,
      nextOfKinPhone: nokPhone,
      gpName: gpName,
      gpAddress: gpAddress,
      gpPhone: gpPhone,
      careManagerName,
      careManagerAddress,
      careManagerPhone,
    },
    medicalCareNeeds: {
      situation,
      background,
      assessment,
      recommendations,
      pastMedicalHistory: pastMedical,
      knownAllergies,
      historyOfConfusion: "no",
      learningDisabilityMentalHealth: "",
      communicationIssues: "",
      hearingAid: false,
      glasses: false,
      otherAids: "",
      mobilityAssistance: "independent",
      mobilityAids: "",
      historyOfFalls: false,
      dateOfLastFall: "",
      toiletingAssistance: "independent",
      continenceStatus: "continent",
      nutritionalAssistance: "independent",
      dietType: dietSummary || "",
      swallowingDifficulties: false,
      enteralNutrition: false,
      mustScore: "",
      personalHygieneAssistance: "independent",
      topDentures: false,
      bottomDentures: false,
      denturesAccompanying: false,
    },
    skinMedicationAttachments: {
      skinIntegrityAssistance: "independent",
      bradenScore: "",
      skinStateOnTransfer: skinState,
      currentSkinCareRegime: "",
      pressureRelievingEquipment: "",
      knownToTVN: false,
      tvnName: "",
      currentMedicationRegime: medRegime,
      lastMedicationDateTime: nowSlice,
      lastMealDrinkDateTime: "",
      attachments: {
        currentMedications: medications.some((m) => (m.status ?? "active") === "active"),
        bodyMap: bodyMapsCount > 0,
        observations: false,
        dnacprForm: false,
        enteralFeedingRegime: false,
        other: false,
        otherSpecify: "",
      },
    },
    signOff: {
      signature: pickString(profile?.name) || "",
      printedName: pickString(profile?.name) || "",
      designation: pickString(profile?.designation) || pickString(profile?.role) || "",
      contactPhone: pickString(profile?.phone) || "",
      completedDate: format(new Date(), "yyyy-MM-dd"),
    },
  };

  if (!isEditing || !initialData) {
    return prefill;
  }

  const g = stripUndefined(initialData.generalDetails);
  const m = stripUndefined(initialData.medicalCareNeeds);
  const so = stripUndefined(initialData.signOff);
  const skin = initialData.skinMedicationAttachments;
  const { attachments: skinAtt, ...skinRest } = skin || {};
  const sRestClean = stripUndefined(skinRest as UnknownRecord);
  const att = stripUndefined(skinAtt as UnknownRecord);

  return {
    generalDetails: {
      ...prefill.generalDetails,
      ...g,
    },
    medicalCareNeeds: {
      ...prefill.medicalCareNeeds,
      ...m,
    },
    skinMedicationAttachments: {
      ...prefill.skinMedicationAttachments,
      ...sRestClean,
      attachments: {
        ...prefill.skinMedicationAttachments.attachments,
        ...att,
      },
    },
    signOff: {
      ...prefill.signOff,
      ...so,
    },
  };
}
