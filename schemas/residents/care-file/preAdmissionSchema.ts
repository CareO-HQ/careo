import { z } from "zod";

export const preAdmissionSchema = z.object({
  // Resident information
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  savedAsDraft: z.boolean(),

  // Header information
  consentAcceptedAt: z.number().min(1, "Consent must be accepted to proceed"),
  careHomeName: z.string().min(1, "Care home name is required"),
  nhsHealthCareNumber: z.string().optional(),
  userName: z.string().optional(),
  jobRole: z.string().optional(),
  date: z.number(),

  // Resident information
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  ethnicity: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  religion: z.string().optional(),
  dateOfBirth: z.string().optional(),

  // Next of kin
  kinFirstName: z.string().optional(),
  kinLastName: z.string().optional(),
  kinRelationship: z.string().optional(),
  kinPhoneNumber: z.string().optional(),

  // Professional contacts
  careManagerName: z.string().optional(),
  careManagerPhoneNumber: z.string().optional(),
  districtNurseName: z.string().optional(),
  districtNursePhoneNumber: z.string().optional(),
  generalPractitionerName: z.string().optional(),
  generalPractitionerPhoneNumber: z.string().optional(),
  providerHealthcareInfoName: z.string().optional(),
  providerHealthcareInfoDesignation: z.string().optional(),

  // Medical information
  allergies: z.string(),
  medicalHistory: z.string(),
  medicationPrescribed: z.string(),

  // Assessment
  consentCapacityRights: z.string().optional(),
  medication: z.string().optional(),
  mobility: z.string().optional(),
  nutrition: z.string().optional(),
  continence: z.string().optional(),
  hygieneDressing: z.string().optional(),
  skin: z.string().optional(),
  cognition: z.string().optional(),
  infection: z.string().optional(),
  breathing: z.string().optional(),
  alteredStateOfConsciousness: z.string().optional(),

  // Palliative and End of life care
  dnacpr: z.boolean(),
  advancedDecision: z.boolean(),
  capacity: z.boolean(),
  advancedCarePlan: z.boolean(),
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
  financesName: z.string().optional(),
  financesAddress: z.string().optional(),
  financesContactNumber: z.string().optional(),

  // Administrative
  signature: z.string().optional(),

  // Additional considerations
  additionalConsiderations: z.string(),

  // Outcome
  outcome: z.string(),
  plannedAdmissionDate: z.number().optional()
});

export type PreAdmissionSchema = z.infer<typeof preAdmissionSchema>;
