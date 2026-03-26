import { z } from "zod";

export const PersonalProfileSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),

  // Consent
  informationSharingConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to share this information with relevant staff"
  }),

  // Resident details
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.number(),
  desiredName: z.string().min(1, "Preferred name is required"),

  // Life Story Sections
  birthAndGrowth: z.string().optional(),
  parentsDetails: z.string().optional(),
  siblingsDetails: z.string().optional(),
  religionSpirituality: z.string().optional(),
  schoolChildhood: z.string().optional(),
  friendsNeighbours: z.string().optional(),
  partnerFamilyDetails: z.string().optional(),
  workHistory: z.string().optional(),

  // Personal, Health & Well-being
  personality: z.string().optional(),
  hobbiesInterests: z.string().optional(),
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  happiestMemory: z.string().optional(),
  enjoyTalkingAbout: z.string().optional(),
  traumaticEvents: z.string().optional(),
  usualRoutine: z.string().optional(),
  mentalHealthProblems: z.string().optional(),
  illnessRecovery: z.string().optional(),
  physicalHealthProblems: z.string().optional(),
  feelingsAboutCare: z.string().optional(),
  staffDifficulties: z.string().optional(),
  additionalComments: z.string().optional(),

  // Family / Representative Signature
  familyRepName: z.string().optional(),
  familyRepRelationship: z.string().optional(),
  familyRepDate: z.number().optional(),
  familyRepSignature: z.string().optional(),

  // Completed By (Staff)
  completedByName: z.string().optional(),
  completedByDesignation: z.string().optional(),
  completedByDate: z.number().optional(),
  completedBySignature: z.string().optional(),

  // Form Metadata
  assessmentDate: z.number(),
  status: z.string().optional(),
});

export type PersonalProfileData = z.infer<typeof PersonalProfileSchema>;
