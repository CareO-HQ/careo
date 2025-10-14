import { z } from "zod";

export const CreateTimlAssessmentSchema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Agree on being completed
  agree: z.boolean().refine((val) => val === true, {
    message: "You must agree before continuing"
  }),

  // Resident details
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.number(),
  desiredName: z.string().min(1, "Desired name is required"),

  // Childhood
  born: z.string(),
  parentsSiblingsNames: z.string(),
  familyMembersOccupation: z.string(),
  whereLived: z.string(),
  schoolAttended: z.string(),
  favouriteSubject: z.string(),
  pets: z.boolean(),
  petsNames: z.string().optional(),

  // Adolescence
  whenLeavingSchool: z.string(),
  whatWork: z.string(),
  whereWorked: z.string(),
  specialTraining: z.string(),
  specialMemoriesWork: z.string(),
  nationalService: z.string(),

  // Adulthood
  partner: z.string(),
  partnerName: z.string(),
  whereMet: z.string(),
  whereWhenMarried: z.string(),
  whatDidYouWear: z.string(),
  flowers: z.string(),
  honeyMoon: z.string(),
  whereLivedAdult: z.string(),
  childrenAndNames: z.string(),
  grandchildrenAndNames: z.string(),
  specialFriendsAndNames: z.string(),
  specialFriendsMetAndStillTouch: z.string(),

  // Retirement
  whenRetired: z.string(),
  lookingForwardTo: z.string(),
  hobbiesInterests: z.string(),
  biggestChangesRetirement: z.string(),

  // Likes and dislikes
  whatEnjoyNow: z.string(),
  whatLikeRead: z.string(),

  // Completed by
  completedBy: z.string().min(1, "Completed by is required"),
  completedByJobRole: z.string().min(1, "Job role is required"),
  completedBySignature: z.string().min(1, "Signature is required"),
  date: z.number()
});

export type CreateTimlAssessmentData = z.infer<
  typeof CreateTimlAssessmentSchema
>;
