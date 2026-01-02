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

export const skinIntegrityAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information & date
  residentName: v.string(),
  bedroomNumber: v.string(),
  date: v.number(),

  // Questions
  sensoryPerception: v.union(
    v.literal(1),
    v.literal(2),
    v.literal(3),
    v.literal(4)
  ),
  moisture: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
  activity: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
  mobility: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
  nutrition: v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4)),
  frictionShear: v.union(v.literal(1), v.literal(2), v.literal(3)),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
  lastModifiedAt: v.optional(v.number()),
  lastModifiedBy: v.optional(v.string()),
  pdfUrl: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number())
});

export const residentValuablesAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information
  residentName: v.string(),
  bedroomNumber: v.string(),
  date: v.number(),
  completedBy: v.string(),
  witnessedBy: v.string(),

  // Valuables
  valuables: v.array(v.object({ value: v.string() })),

  // Money
  n50: v.optional(v.number()),
  n20: v.optional(v.number()),
  n10: v.optional(v.number()),
  n5: v.optional(v.number()),
  n2: v.optional(v.number()),
  n1: v.optional(v.number()),
  p50: v.optional(v.number()),
  p20: v.optional(v.number()),
  p10: v.optional(v.number()),
  p5: v.optional(v.number()),
  p2: v.optional(v.number()),
  p1: v.optional(v.number()),
  total: v.number(),

  // Clothing
  clothing: v.array(v.object({ value: v.string() })),

  // Other
  other: v.array(
    v.object({
      details: v.string(),
      receivedBy: v.string(),
      witnessedBy: v.string(),
      date: v.number(),
      time: v.string()
    })
  ),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),
  pdfFileId: v.optional(v.id("_storage"))
}).index("by_resident", ["residentId"]);

export const residentHandlingProfileForm = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),

  // Completed by
  completedBy: v.string(),
  jobRole: v.string(),
  date: v.number(),

  // Resident information
  residentName: v.string(),
  bedroomNumber: v.string(),
  weight: v.number(),
  weightBearing: v.string(),

  // Transfer to or from bed
  transferBed: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Transfer to or from chair
  transferChair: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Transfer to or from chair
  walking: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Toileting
  toileting: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Movement in bed
  movementInBed: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),
  // Bathing
  bath: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Outdoor mobility
  outdoorMobility: v.object({
    nStaff: v.number(),
    equipment: v.string(),
    handlingPlan: v.string(),
    dateForReview: v.number()
  }),

  // Metadata
  status: v.optional(
    v.union(v.literal("draft"), v.literal("submitted"), v.literal("reviewed"))
  ),
  submittedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()),

  // PDF file ID
  pdfFileId: v.optional(v.id("_storage"))
}).index("by_resident", ["residentId"]);

export const painAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Resident information & header
  residentName: v.string(),
  dateOfBirth: v.string(),
  roomNumber: v.string(),
  nameOfHome: v.string(),
  assessmentDate: v.number(),

  // Array of assessment entries
  assessmentEntries: v.array(
    v.object({
      dateTime: v.string(),
      painLocation: v.string(),
      descriptionOfPain: v.string(),
      residentBehaviour: v.string(),
      interventionType: v.string(),
      interventionTime: v.string(),
      painAfterIntervention: v.string(),
      comments: v.optional(v.string()),
      signature: v.string()
    })
  ),

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

export const nutritionalAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Section 1: Resident Information
  residentName: v.string(),
  dateOfBirth: v.string(),
  bedroomNumber: v.string(),
  height: v.string(),
  weight: v.string(),
  mustScore: v.string(),

  // Section 2: Clinical Involvement
  hasSaltInvolvement: v.boolean(),
  saltTherapistName: v.optional(v.string()),
  saltContactDetails: v.optional(v.string()),
  hasDietitianInvolvement: v.boolean(),
  dietitianName: v.optional(v.string()),
  dietitianContactDetails: v.optional(v.string()),

  // Section 3: Dietary Requirements & Supplements
  foodFortificationRequired: v.optional(v.string()),
  supplementsPrescribed: v.optional(v.string()),

  // Section 4: IDDSI Consistency Levels
  foodConsistency: v.object({
    level7EasyChew: v.optional(v.boolean()),
    level6SoftBiteSized: v.optional(v.boolean()),
    level5MincedMoist: v.optional(v.boolean()),
    level4Pureed: v.optional(v.boolean()),
    level3Liquidised: v.optional(v.boolean())
  }),
  fluidConsistency: v.object({
    level4ExtremelyThick: v.optional(v.boolean()),
    level3ModeratelyThick: v.optional(v.boolean()),
    level2MildlyThick: v.optional(v.boolean()),
    level1SlightlyThick: v.optional(v.boolean()),
    level0Thin: v.optional(v.boolean())
  }),

  // Section 5: Assistance & Administration
  assistanceRequired: v.string(),
  completedBy: v.string(),
  jobRole: v.string(),
  signature: v.string(),
  assessmentDate: v.number(),

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

export const oralAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Section 1: Basic Resident Information
  residentName: v.string(),
  dateOfBirth: v.string(),
  weight: v.string(),
  height: v.string(),
  completedBy: v.string(),
  signature: v.string(),
  assessmentDate: v.number(),

  // Section 2: Dental History and Registration
  normalOralHygieneRoutine: v.string(),
  isRegisteredWithDentist: v.boolean(),
  lastSeenByDentist: v.optional(v.string()),
  dentistName: v.optional(v.string()),
  dentalPracticeAddress: v.optional(v.string()),
  contactTelephone: v.optional(v.string()),

  // Section 3: Physical Oral Examination
  lipsDryCracked: v.boolean(),
  lipsDryCrackedCare: v.optional(v.string()),
  tongueDryCracked: v.boolean(),
  tongueDryCrackedCare: v.optional(v.string()),
  tongueUlceration: v.boolean(),
  tongueUlcerationCare: v.optional(v.string()),
  hasTopDenture: v.boolean(),
  topDentureCare: v.optional(v.string()),
  hasLowerDenture: v.boolean(),
  lowerDentureCare: v.optional(v.string()),
  hasDenturesAndNaturalTeeth: v.boolean(),
  denturesAndNaturalTeethCare: v.optional(v.string()),
  hasNaturalTeeth: v.boolean(),
  naturalTeethCare: v.optional(v.string()),
  evidencePlaqueDebris: v.boolean(),
  plaqueDebrisCare: v.optional(v.string()),
  dryMouth: v.boolean(),
  dryMouthCare: v.optional(v.string()),

  // Section 4: Symptoms and Functional Assessment
  painWhenEating: v.boolean(),
  painWhenEatingCare: v.optional(v.string()),
  gumsUlceration: v.boolean(),
  gumsUlcerationCare: v.optional(v.string()),
  difficultySwallowing: v.boolean(),
  difficultySwallowingCare: v.optional(v.string()),
  poorFluidDietaryIntake: v.boolean(),
  poorFluidDietaryIntakeCare: v.optional(v.string()),
  dehydrated: v.boolean(),
  dehydratedCare: v.optional(v.string()),
  speechDifficultyDryMouth: v.boolean(),
  speechDifficultyDryMouthCare: v.optional(v.string()),
  speechDifficultyDenturesSlipping: v.boolean(),
  speechDifficultyDenturesSlippingCare: v.optional(v.string()),
  dexterityProblems: v.boolean(),
  dexterityProblemsCare: v.optional(v.string()),
  cognitiveImpairment: v.boolean(),
  cognitiveImpairmentCare: v.optional(v.string()),

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

export const dietNotifications = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Header & Administrative Information
  residentName: v.string(),
  roomNumber: v.string(),
  completedBy: v.string(),
  printName: v.string(),
  jobRole: v.string(),
  signature: v.string(),
  dateCompleted: v.number(),
  reviewDate: v.number(),

  // Dietary Preferences & Risks
  likesFavouriteFoods: v.optional(v.string()),
  dislikes: v.optional(v.string()),
  foodsToBeAvoided: v.optional(v.string()),
  chokingRiskAssessment: v.union(
    v.literal("Low Risk"),
    v.literal("Medium Risk"),
    v.literal("High Risk")
  ),

  // Meal & Fluid Specifications
  preferredMealSize: v.union(
    v.literal("Small"),
    v.literal("Standard"),
    v.literal("Large")
  ),
  assistanceRequired: v.optional(v.string()),
  dietType: v.optional(v.string()),

  // Food Consistency (IDDSI Levels)
  foodConsistencyLevel7Regular: v.optional(v.boolean()),
  foodConsistencyLevel7EasyChew: v.optional(v.boolean()),
  foodConsistencyLevel6SoftBiteSized: v.optional(v.boolean()),
  foodConsistencyLevel5MincedMoist: v.optional(v.boolean()),
  foodConsistencyLevel4Pureed: v.optional(v.boolean()),
  foodConsistencyLevel3Liquidised: v.optional(v.boolean()),

  // Fluid Consistency (IDDSI Levels)
  fluidConsistencyLevel4ExtremelyThick: v.optional(v.boolean()),
  fluidConsistencyLevel3ModeratelyThick: v.optional(v.boolean()),
  fluidConsistencyLevel2MildlyThick: v.optional(v.boolean()),
  fluidConsistencyLevel1SlightlyThick: v.optional(v.boolean()),
  fluidConsistencyLevel0Thin: v.optional(v.boolean()),

  // Additional Requirements
  fluidRequirements: v.optional(v.string()),
  foodAllergyOrIntolerance: v.optional(v.string()),

  // Kitchen Review
  reviewedByCookChef: v.optional(v.string()),
  reviewerPrintName: v.optional(v.string()),
  reviewerJobTitle: v.optional(v.string()),
  reviewDateKitchen: v.optional(v.number()),

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

export const chokingRiskAssessments = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Administrative Information
  residentName: v.string(),
  dateOfBirth: v.string(),
  dateOfAssessment: v.string(),
  time: v.string(),

  // Respiratory Risks (10 points each if YES)
  weakCough: v.optional(v.boolean()),
  chestInfections: v.optional(v.boolean()),
  breathingDifficulties: v.optional(v.boolean()),
  knownToAspirate: v.optional(v.boolean()),
  chokingHistory: v.optional(v.boolean()),
  gurgledVoice: v.optional(v.boolean()),

  // At Risk Groups
  epilepsy: v.optional(v.boolean()), // 4 points
  cerebralPalsy: v.optional(v.boolean()), // 10 points
  dementia: v.optional(v.boolean()), // 4 points
  mentalHealth: v.optional(v.boolean()), // 4 points
  neurologicalConditions: v.optional(v.boolean()), // 10 points
  learningDisabilities: v.optional(v.boolean()), // 10 points

  // Physical Risks
  posturalProblems: v.optional(v.boolean()), // 10 points
  poorHeadControl: v.optional(v.boolean()), // 10 points
  tongueThrust: v.optional(v.boolean()), // 10 points
  chewingDifficulties: v.optional(v.boolean()), // 10 points
  slurredSpeech: v.optional(v.boolean()), // 8 points
  neckTrauma: v.optional(v.boolean()), // 8 points
  poorDentition: v.optional(v.boolean()), // 8 points

  // Eating Behaviours
  eatsRapidly: v.optional(v.boolean()), // 10 points
  drinksRapidly: v.optional(v.boolean()), // 10 points
  eatsWhileCoughing: v.optional(v.boolean()), // 10 points
  drinksWhileCoughing: v.optional(v.boolean()), // 10 points
  crammingFood: v.optional(v.boolean()), // 10 points
  pocketingFood: v.optional(v.boolean()), // 8 points
  swallowingWithoutChewing: v.optional(v.boolean()), // 8 points
  wouldTakeFood: v.optional(v.boolean()), // 4 points

  // Protective Factors (2 points if NO)
  drinksIndependently: v.optional(v.boolean()),
  eatsIndependently: v.optional(v.boolean()),

  // Additional fields
  completedBy: v.string(),
  signature: v.optional(v.string()),

  // Calculated fields
  totalScore: v.number(),
  riskLevel: v.string(),

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

export const cornellDepressionScales = defineTable({
  // Metadata
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  userId: v.string(),

  // Administrative Information
  residentName: v.string(),
  dateOfBirth: v.string(),
  dateOfAssessment: v.string(),
  assessedBy: v.string(),

  // A. Mood-Related Signs (0=Absent, 1=Mild/Intermittent, 2=Severe)
  anxiety: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  sadness: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  lackOfReactivity: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  irritability: v.union(v.literal("0"), v.literal("1"), v.literal("2")),

  // B. Behavioral Disturbance
  agitation: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  retardation: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  multiplePhysicalComplaints: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  lossOfInterest: v.union(v.literal("0"), v.literal("1"), v.literal("2")),

  // C. Physical Signs
  appetiteLoss: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  weightLoss: v.union(v.literal("0"), v.literal("1"), v.literal("2")),

  // D. Cyclic Functions
  diurnalVariation: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  sleepDisturbance: v.union(v.literal("0"), v.literal("1"), v.literal("2")),

  // E. Ideational Disturbance
  suicidalIdeation: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  lowSelfEsteem: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  pessimism: v.union(v.literal("0"), v.literal("1"), v.literal("2")),
  moodCongruentDelusions: v.union(v.literal("0"), v.literal("1"), v.literal("2")),

  // Completion fields
  signature: v.optional(v.string()),

  // Calculated fields
  totalScore: v.number(),
  severity: v.string(),

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
