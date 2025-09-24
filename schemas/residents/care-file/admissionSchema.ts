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
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  NHSNumber: z.string().min(1, "NHS number is required"),
  ethnicity: z.string().optional(),

  // Next of kin
  kinFirstName: z.string().min(1, "Next of kin first name is required"),
  kinLastName: z.string().min(1, "Next of kin last name is required"),
  kinRelationship: z.string().min(1, "Next of kin relationship is required"),
  kinTelephoneNumber: z
    .string()
    .min(1, "Next of kin telephone number is required"),
  kinAddress: z.string().min(1, "Next of kin address is required"),
  kinEmail: z.string().email("Valid email is required"),

  // Emergency contacts
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactTelephoneNumber: z
    .string()
    .min(1, "Emergency contact telephone number is required"),
  emergencyContactRelationship: z
    .string()
    .min(1, "Emergency contact relationship is required"),
  emergencyContactPhoneNumber: z
    .string()
    .min(1, "Emergency contact phone number is required"),

  // Care manager
  careManagerName: z.string().optional(),
  careManagerTelephoneNumber: z.string().optional(),
  careManagerRelationship: z.string().optional(),
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

  // Sleep
  bedtimeRoutine: z.string().optional(),

  // Infection control
  currentInfection: z.string().optional(),
  antibioticsPrescribed: z.boolean(),

  // Breathing
  prescribedBreathing: z.string().optional(),

  // Mobility
  mobilityIndependent: z.boolean(),
  assistanceRequired: z.string().optional(),
  equipmentRequired: z.string().optional(),

  // Nutrition
  weight: z.string().min(1, "Weight is required"),
  height: z.string().min(1, "Height is required"),
  iddsiFood: z.string().min(1, "IDDSI food level is required"),
  iddsiFluid: z.string().min(1, "IDDSI fluid level is required"),
  dietType: z.string().min(1, "Diet type is required"),
  nutritionalSupplements: z.string().optional(),
  nutritionalAssistanceRequired: z.string().optional(),
  chockingRisk: z.boolean(),
  additionalComments: z.string().optional(),

  // Continence
  continence: z.string().optional(),

  // Hygiene
  hygiene: z.string().optional()
});

export type AdmissionAssessment = z.infer<typeof admissionAssessmentSchema>;
