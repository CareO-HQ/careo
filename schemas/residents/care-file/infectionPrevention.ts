import { z } from "zod";

export const InfectionPreventionAssessmentSchema = z.object({
  // Person's details
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  homeAddress: z.string().min(1, "Home address is required"),
  assessmentType: z.enum(["Pre-admission", "Admission"]),
  informationProvidedBy: z.string().optional(),
  admittedFrom: z.string().optional(),
  consultantGP: z.string().optional(),
  reasonForAdmission: z.string().optional(),
  dateOfAdmission: z.string().optional(),

  // Acute Respiratory Illness (ARI)
  newContinuousCough: z.boolean(),
  worseningCough: z.boolean(),
  temperatureHigh: z.boolean(),
  otherRespiratorySymptoms: z.string().optional(),
  testedForCovid19: z.boolean(),
  testedForInfluenzaA: z.boolean(),
  testedForInfluenzaB: z.boolean(),
  testedForRespiratoryScreen: z.boolean(),
  influenzaB: z.boolean(),
  respiratoryScreen: z.boolean(),
  // Exposure
  exposureToPatientsCovid: z.boolean(),
  exposureToStaffCovid: z.boolean(),
  isolationRequired: z.boolean(),
  isolationDetails: z.string().optional(),
  furtherTreatmentRequired: z.boolean(),

  // Infective Diarrhoea / Vomiting
  diarrheaVomitingCurrentSymptoms: z.boolean(),
  diarrheaVomitingContactWithOthers: z.boolean(),
  diarrheaVomitingFamilyHistory72h: z.boolean(),

  // Clostridium Difficile
  clostridiumActive: z.boolean(),
  clostridiumHistory: z.boolean(),
  clostridiumStoolCount72h: z.string().optional(),
  clostridiumLastPositiveSpecimenDate: z.string().optional(),
  clostridiumResult: z.string().optional(),
  clostridiumTreatmentReceived: z.string().optional(),
  clostridiumTreatmentComplete: z.boolean().optional(),
  ongoingDetails: z.string().optional(),
  ongoingDateCommenced: z.string().optional(),
  ongoingLengthOfCourse: z.string().optional(),
  ongoingFollowUpRequired: z.string().optional(),

  // MRSA / MSSA
  mrsaMssaColonised: z.boolean(),
  mrsaMssaInfected: z.boolean(),
  mrsaMssaLastPositiveSwabDate: z.string().optional(),
  mrsaMssaSitesPositive: z.string().optional(),
  mrsaMssaTreatmentReceived: z.string().optional(),
  mrsaMssaTreatmentComplete: z.boolean().optional(),
  mrsaMssaDetails: z.string().optional(),
  mrsaMssaDateCommenced: z.string().optional(),
  mrsaMssaLengthOfCourse: z.string().optional(),
  mrsaMssaFollowUpRequired: z.string().optional(),

  // Multi-drug resistant organisms
  esbl: z.boolean(),
  vreGre: z.boolean(),
  cpe: z.boolean(),
  otherMultiDrugResistance: z.string().optional(),
  relevantInformationMultiDrugResistance: z.string().optional(),

  // Other Information
  awarenessOfInfection: z.boolean(),
  lastFluVaccinationDate: z.string().optional(),

  // Assessment Completion
  completedBy: z.string().min(1, "Completed by is required"),
  jobRole: z.string().min(1, "Job role is required"),
  signature: z.string().min(1, "Signature is required"),
  completionDate: z.string().min(1, "Date is required")
});
