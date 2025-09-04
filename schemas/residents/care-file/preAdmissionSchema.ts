import { z } from "zod";

export const preAdmissionSchema = z.object({
  // Resident information
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  savedAsDraft: z.boolean(),

  // Header information
  consentAcceptedAt: z.number(),
  careHomeName: z.string(),
  nhsHealthCareNumber: z.string(),
  userName: z.string(),
  jobRole: z.string(),
  date: z.number(),

  // Resident information
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  phoneNumber: z.string(),
  ethnicity: z.string(),
  gender: z.enum(["male", "female"]),
  religion: z.string(),
  dateOfBirth: z.string(),

  // Next of kin
  kinFirstName: z.string(),
  kinLastName: z.string(),
  kinRelationship: z.string(),
  kinPhoneNumber: z.string(),

  // Professional contacts
  careManagerName: z.string(),
  careManagerPhoneNumber: z.string(),
  districtNurseName: z.string(),
  districtNursePhoneNumber: z.string(),
  generalPractitionerName: z.string(),
  generalPractitionerPhoneNumber: z.string(),
  providerHealthcareInfoName: z.string(),
  providerHealthcareInfoDesignation: z.string(),

  // Medical information
  allergies: z.string(),
  medicalHistory: z.string(),
  medicationPrescribed: z.string(),

  // Assessment
  consentCapacityRights: z.string(),
  medication: z.string(),
  mobility: z.string(),
  nutrition: z.string(),
  continence: z.string(),
  hygieneDressing: z.string(),
  skin: z.string(),
  cognition: z.string(),
  infection: z.string(),
  breathing: z.string(),
  alteredStateOfConsciousness: z.string(),

  // Palliative and End of life care
  dnacpr: z.boolean(),
  advancedDecision: z.string(),
  capacity: z.string(),
  advancedCarePlan: z.string(),
  comments: z.string(),

  // Preferences
  roomPreferences: z.string(),
  admissionContact: z.string(),
  foodPreferences: z.string(),
  preferedName: z.string(),
  familyConcerns: z.string(),

  // Other information
  otherHealthCareProfessional: z.string(),
  equipment: z.string(),

  // Financial
  attendFinances: z.boolean(),

  // Additional considerations
  additionalConsiderations: z.string(),

  // Outcome
  outcome: z.string(),
  plannedAdmissionDate: z.number().optional(),

  // Utils
  createdAt: z.number(),
  createdBy: z.string()
});

export type PreAdmissionSchema = z.infer<typeof preAdmissionSchema>;
