import { defineTable } from "convex/server";
import { v } from "convex/values";

const LimbMobility = v.union(
  v.literal("FULLY"),
  v.literal("PARTIALLY"),
  v.literal("NONE")
);

const RiskState = v.union(
  v.literal("ALWAYS"),
  v.literal("SOMETIMES"),
  v.literal("NEVER")
);

export const movingHandlingAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  //   1. Resident information
  residentName: v.string(),
  dateOfBirth: v.number(),
  bedroomNumber: v.string(),
  weight: v.number(),
  height: v.number(),
  historyOfFalls: v.boolean(),

  //   2
  independentMobility: v.boolean(),
  canWeightBear: v.union(
    v.literal("FULLY"),
    v.literal("PARTIALLY"),
    v.literal("WITH-AID"),
    v.literal("NO-WEIGHTBEARING")
  ),
  limbUpperRight: LimbMobility,
  limbUpperLeft: LimbMobility,
  limbLowerRight: LimbMobility,
  limbLowerLeft: LimbMobility,
  equipmentUsed: v.optional(v.string()),
  needsRiskStaff: v.optional(v.string()),

  //  3
  deafnessState: RiskState,
  deafnessComments: v.optional(v.string()),
  blindnessState: RiskState,
  blindnessComments: v.optional(v.string()),
  unpredictableBehaviourState: RiskState,
  unpredictableBehaviourComments: v.optional(v.string()),
  uncooperativeBehaviourState: RiskState,
  uncooperativeBehaviourComments: v.optional(v.string()),

  //   4
  distressedReactionState: RiskState,
  distressedReactionComments: v.optional(v.string()),
  disorientatedState: RiskState,
  disorientatedComments: v.optional(v.string()),
  unconsciousState: RiskState,
  unconsciousComments: v.optional(v.string()),
  unbalanceState: RiskState,
  unbalanceComments: v.optional(v.string()),

  //   5
  spasmsState: RiskState,
  spasmsComments: v.optional(v.string()),
  stiffnessState: RiskState,
  stiffnessComments: v.optional(v.string()),
  cathetersState: RiskState,
  cathetersComments: v.optional(v.string()),
  incontinenceState: RiskState,
  incontinenceComments: v.optional(v.string()),

  //   6
  localisedPain: RiskState,
  localisedPainComments: v.optional(v.string()),
  otherState: RiskState,
  otherComments: v.optional(v.string()),

  // 7
  completedBy: v.string(),
  jobRole: v.string(),
  signature: v.string(),
  completionDate: v.string()
});

export const longTermFallsRiskAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // 1. Resident information
  age: v.union(v.literal("65-80"), v.literal("81-85"), v.literal("86+")),
  gender: v.union(v.literal("MALE"), v.literal("FEMALE")),
  historyOfFalls: v.union(
    v.literal("RECURRENT-LAST-12"),
    v.literal("FALL-LAST-12"),
    v.literal("FALL-MORE-THAN-12"),
    v.literal("NEVER")
  ),
  mobilityLevel: v.union(
    v.literal("ASSISTANCE-1-AID"),
    v.literal("ASSISTANCE-2-AID"),
    v.literal("INDEPENDENT-WITH-AID"),
    v.literal("INDEPENDENT-SAFE-UNAIDED"),
    v.literal("IMMOBILE")
  ),
  standUnsupported: v.boolean(),
  personalActivities: v.union(
    v.literal("ASSISTANCE"),
    v.literal("INDEPENDENT-EQUIPMENT"),
    v.literal("INDEPENDENT-SAFE")
  ),
  domesticActivities: v.optional(
    v.union(
      v.literal("ASSISTANCE"),
      v.literal("INDEPENDENT-EQUIPMENT"),
      v.literal("INDEPENDENT-SAFE")
    )
  ),
  footwear: v.union(v.literal("UNSAFE"), v.literal("SAFE")),
  visionProblems: v.boolean(),
  bladderBowelMovement: v.union(
    v.literal("FREQUENCY"),
    v.literal("IDENTIFIED-PROBLEMS"),
    v.literal("NO-PROBLEMS")
  ),
  residentEnvironmentalRisks: v.boolean(),
  socialRisks: v.union(
    v.literal("LIVES-ALONE"),
    v.literal("LIMITED-SUPPORT"),
    v.literal("24H-CARE")
  ),
  medicalCondition: v.union(
    v.literal("NEUROLOGICAL-PROBLEMS"),
    v.literal("POSTURAL"),
    v.literal("CARDIAC"),
    v.literal("SKELETAL-CONDITION"),
    v.literal("FRACTURES"),
    v.literal("LISTED-CONDITIONS"),
    v.literal("NO-IDENTIFIED")
  ),
  medicines: v.union(
    v.literal("4-OR-MORE"),
    v.literal("LESS-4"),
    v.literal("NO-MEDICATIONS")
  ),
  safetyAwarness: v.boolean(),
  mentalState: v.union(v.literal("CONFUSED"), v.literal("ORIENTATED")),
  completedBy: v.string(),
  completionDate: v.string(),

  // Metadata
  savedAsDraft: v.optional(v.boolean()),
  createdBy: v.string()
});

export const admissionAssesments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.number(),
  bedroomNumber: v.string(),
  admittedFrom: v.optional(v.string()),
  religion: v.optional(v.string()),
  telephoneNumber: v.optional(v.string()),
  gender: v.optional(v.union(v.literal("MALE"), v.literal("FEMALE"))),
  NHSNumber: v.string(),
  ethnicity: v.optional(v.string()),

  // Next of kin
  kinFirstName: v.string(),
  kinLastName: v.string(),
  kinRelationship: v.string(),
  kinTelephoneNumber: v.string(),
  kinAddress: v.string(),
  kinEmail: v.string(),

  // Emergency contacts
  emergencyContactName: v.string(),
  emergencyContactTelephoneNumber: v.string(),
  emergencyContactRelationship: v.string(),
  emergencyContactPhoneNumber: v.string(),

  // Care manager
  careManagerName: v.optional(v.string()),
  careManagerTelephoneNumber: v.optional(v.string()),
  careManagerRelationship: v.optional(v.string()),
  careManagerPhoneNumber: v.optional(v.string()),
  careManagerAddress: v.optional(v.string()),
  careManagerJobRole: v.optional(v.string()),

  // GP
  GPName: v.optional(v.string()),
  GPAddress: v.optional(v.string()),
  GPPhoneNumber: v.optional(v.string()),

  // Allergies
  allergies: v.optional(v.string()),

  // Medications
  medicalHistory: v.optional(v.string()),

  // Prescribed medications
  prescribedMedications: v.optional(v.string()),

  //
  consentCapacityRights: v.optional(v.string()),
  medication: v.optional(v.string()),

  // Skin integrity
  skinIntegrityEquipment: v.optional(v.string()),
  skinIntegrityWounds: v.optional(v.string()),

  // Sleep
  bedtimeRoutine: v.optional(v.string()),

  // Infection control
  currentInfection: v.optional(v.string()),
  antibioticsPrescribed: v.boolean(),

  // Breathing
  prescribedBreathing: v.optional(v.string()),

  // Mobility
  mobilityIndependent: v.boolean(),
  assistanceRequired: v.optional(v.string()),
  equipmentRequired: v.optional(v.string()),

  // Nutrition
  weight: v.string(),
  height: v.string(),
  iddsiFood: v.string(),
  iddsiFluid: v.string(),
  dietType: v.string(),
  nutritionalSupplements: v.optional(v.string()),
  nutritionalAssistanceRequired: v.optional(v.string()),
  chockingRisk: v.boolean(),
  additionalComments: v.optional(v.string()),

  // Continence
  continence: v.optional(v.string()),

  // Hygiene
  hygiene: v.optional(v.string())
});

export const photographyConsents = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  residentName: v.string(),
  bedroomNumber: v.string(),
  dateOfBirth: v.number(),

  // Consent
  healthcareRecords: v.boolean(),
  socialActivitiesInternal: v.boolean(),
  socialActivitiesExternal: v.boolean(),

  // Signature
  residentSignature: v.optional(v.string()),
  // Representative
  representativeName: v.optional(v.string()),
  representativeRelationship: v.optional(v.string()),
  representativeSignature: v.optional(v.string()),
  representativeDate: v.optional(v.number()),

  // Staff
  nameStaff: v.string(),
  staffSignature: v.string(),
  date: v.number(),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.string(),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
});

export const dnacprs = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  residentName: v.string(),
  bedroomNumber: v.string(),
  dateOfBirth: v.number(),

  // Questions
  dnacpr: v.boolean(),
  dnacprComments: v.optional(v.string()),
  reason: v.union(
    v.literal("TERMINAL-PROGRESSIVE"),
    v.literal("UNSUCCESSFUL-CPR"),
    v.literal("OTHER")
  ),
  date: v.number(),

  // Discussed with
  discussedResident: v.boolean(),
  discussedResidentComments: v.optional(v.string()),
  discussedResidentDate: v.optional(v.number()),
  discussedRelatives: v.boolean(),
  discussedRelativesComments: v.optional(v.string()),
  discussedRelativeDate: v.optional(v.number()),
  discussedNOKs: v.boolean(),
  discussedNOKsComments: v.optional(v.string()),
  discussedNOKsDate: v.optional(v.number()),
  comments: v.optional(v.string()),

  // GP signature
  gpDate: v.number(),
  gpSignature: v.string(),
  residentNokSignature: v.string(),
  registeredNurseSignature: v.string(),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.string(),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
});

export const peeps = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  residentName: v.string(),
  residentDateOfBirth: v.number(),
  bedroomNumber: v.string(),

  // Questions
  understands: v.boolean(),
  staffNeeded: v.number(),
  equipmentNeeded: v.optional(v.string()),
  communicationNeeds: v.optional(v.string()),

  // Steps
  steps: v.optional(
    v.array(
      v.object({
        name: v.string(),
        description: v.string()
      })
    )
  ),

  // Questions
  oxigenInUse: v.boolean(),
  oxigenComments: v.optional(v.string()),
  residentSmokes: v.boolean(),
  residentSmokesComments: v.optional(v.string()),
  furnitureFireRetardant: v.boolean(),
  furnitureFireRetardantComments: v.optional(v.string()),

  // Completed by
  completedBy: v.string(),
  completedBySignature: v.string(),
  date: v.number(),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.string(),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
});

export const dependencyAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  dependencyLevel: v.union(
    v.literal("A"),
    v.literal("B"),
    v.literal("C"),
    v.literal("D")
  ),

  // Completed by
  completedBy: v.string(),
  completedBySignature: v.string(),
  date: v.number(),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.string(),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
}).index("by_resident", ["residentId"]);

export const timlAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // agree on being completed
  agree: v.boolean(),

  // resident details
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.number(),
  desiredName: v.string(),

  // Childhood
  born: v.string(),
  parentsSiblingsNames: v.string(),
  familyMembersOccupation: v.string(),
  whereLived: v.string(),
  schoolAttended: v.string(),
  favouriteSubject: v.string(),
  pets: v.boolean(),
  petsNames: v.optional(v.string()),

  // Adolescence
  whenLeavingSchool: v.string(),
  whatWork: v.string(),
  whereWorked: v.string(),
  specialTraining: v.string(),
  specialMemoriesWork: v.string(),
  nationalService: v.string(),

  // Adulthood
  partner: v.string(),
  partnerName: v.string(),
  whereMet: v.string(),
  whereWhenMarried: v.string(),
  whatDidYouWear: v.string(),
  flowers: v.string(),
  honeyMoon: v.string(),
  whereLivedAdult: v.string(),
  childrenAndNames: v.string(),
  grandchildrenAndNames: v.string(),
  specialFriendsAndNames: v.string(),
  specialFriendsMetAndStillTouch: v.string(),

  // Retirement
  whenRetired: v.string(),
  lookingForwardTo: v.string(),
  hobbiesInterests: v.string(),
  biggestChangesRetirement: v.string(),

  // Likes and dislikes
  whatEnjoyNow: v.string(),
  whatLikeRead: v.string(),

  // Completed by
  completedBy: v.string(),
  completedByJobRole: v.string(),
  completedBySignature: v.string(),
  date: v.number(),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.string(),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
}).index("by_resident", ["residentId"]);
