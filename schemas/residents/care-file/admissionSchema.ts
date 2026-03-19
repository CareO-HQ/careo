import { z } from "zod";

export const admissionAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Resident information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.number(),
  bedroomNumber: z.string().min(1, "Bedroom number is required"),
  admittedFrom: z.string().optional(),
  religion: z.string().optional(),
  telephoneNumber: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  NHSNumber: z.string().optional(),
  ethnicity: z.string().optional(),

  // Next of kin
  kinFirstName: z.string().optional(),
  kinLastName: z.string().optional(),
  kinRelationship: z.string().optional(),
  kinTelephoneNumber: z.string().optional(),
  kinAddress: z.string().optional(),
  kinEmail: z.string().optional(),

  // Emergency contacts
  emergencyContactName: z.string().optional(),
  emergencyContactTelephoneNumber: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhoneNumber: z.string().optional(),

  // Care manager
  careManagerName: z.string().optional(),
  careManagerTelephoneNumber: z.string().optional(),
  careManagerEmail: z.string().optional(),
  careManagerPhoneNumber: z.string().optional(),
  careManagerAddress: z.string().optional(),
  careManagerJobRole: z.string().optional(),

  // GP
  GPName: z.string().optional(),
  GPAddress: z.string().optional(),
  GPPhoneNumber: z.string().optional(),

  // Allergies
  allergies: z.string().optional(),

  // Medications
  medicalHistory: z.string().optional(),

  // Prescribed medications
  prescribedMedications: z.string().optional(),

  //
  consentCapacityRights: z.string().optional(),
  medication: z.string().optional(),

  // Skin integrity
  skinIntegrityEquipment: z.string().optional(),
  skinIntegrityWounds: z.string().optional(),

  // Infection control
  currentInfection: z.string().optional(),
  antibioticsPrescribed: z.boolean(),

  // Mobility
  mobilityIndependent: z.boolean(),
  assistanceRequired: z.string().optional(),
  equipmentRequired: z.string().optional(),

  // Nutrition
  weight: z.string().optional(),
  height: z.string().optional(),
  iddsiFood: z.string().optional(),
  iddsiFluid: z.string().optional(),
  dietType: z.string().optional(),
  nutritionalSupplements: z.string().optional(),
  nutritionalAssistanceRequired: z.string().optional(),
  chokingRisk: z.boolean(),
  additionalComments: z.string().optional(),

  // Continence
  continenceIndependent: z.boolean(),
  continence: z.string().optional(),

  // Hygiene
  hygieneIndependent: z.boolean(),
  hygiene: z.string().optional(),

  // Sleep & Psychological
  sleepPsychologicalIndependent: z.boolean(),
  bedtimeRoutine: z.string().optional(),
  psychologicalNeeds: z.string().optional(),

  // Breathing
  breathingIndependent: z.boolean(),
  prescribedBreathing: z.string().optional(),

  // New Sections from Images
  alteredConsciousness: z.string().optional(),
  communicationIndependent: z.boolean(),
  communication: z.string().optional(),
  behaviourIndependent: z.boolean(),
  behaviour: z.string().optional(),
  cognitionIndependent: z.boolean(),
  cognition: z.string().optional(),

  // Assessment Completion
  completedBy: z.string().optional(),
  jobRole: z.string().optional(),
  signature: z.string().optional(),
  assessmentDate: z.number().optional(),
});

export type AdmissionAssessment = z.infer<typeof admissionAssessmentSchema>;
