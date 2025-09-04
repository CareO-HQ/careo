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
  nhsHealthCareNumber: z
    .string()
    .min(1, "NHS Health & Care Number is required"),
  userName: z.string().min(1, "Name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  date: z.number(),

  // Resident information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  ethnicity: z.string().min(1, "Ethnicity is required"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  religion: z.string().min(1, "Religion is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),

  // Next of kin
  kinFirstName: z.string().min(1, "First name is required"),
  kinLastName: z.string().min(1, "Last name is required"),
  kinRelationship: z.string().min(1, "Relationship is required"),
  kinPhoneNumber: z.string().min(1, "Phone number is required"),

  // Professional contacts
  careManagerName: z.string().min(1, "Care manager name is required"),
  careManagerPhoneNumber: z
    .string()
    .min(1, "Care manager phone number is required"),
  districtNurseName: z.string().min(1, "District nurse name is required"),
  districtNursePhoneNumber: z
    .string()
    .min(1, "District nurse phone number is required"),
  generalPractitionerName: z
    .string()
    .min(1, "General practitioner name is required"),
  generalPractitionerPhoneNumber: z
    .string()
    .min(1, "General practitioner phone number is required"),
  providerHealthcareInfoName: z
    .string()
    .min(1, "Provider healthcare info name is required"),
  providerHealthcareInfoDesignation: z
    .string()
    .min(1, "Provider healthcare info designation is required"),

  // Medical information
  allergies: z.string(),
  medicalHistory: z.string(),
  medicationPrescribed: z.string(),

  // Assessment
  consentCapacityRights: z
    .string()
    .min(1, "Consent capacity rights information is required"),
  medication: z.string().min(1, "Medication information is required"),
  mobility: z.string().min(1, "Mobility information is required"),
  nutrition: z.string().min(1, "Nutrition information is required"),
  continence: z.string().min(1, "Continence information is required"),
  hygieneDressing: z
    .string()
    .min(1, "Personal hygiene & dressing information is required"),
  skin: z
    .string()
    .min(1, "Skin integrity / tissue viability information is required"),
  cognition: z.string().min(1, "Cognition information is required"),
  infection: z.string().min(1, "Infection control information is required"),
  breathing: z.string().min(1, "Breathing information is required"),
  alteredStateOfConsciousness: z
    .string()
    .min(1, "Altered state of consciousness information is required"),

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
