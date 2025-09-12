import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const TaskStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("partially_completed"),
  v.literal("not_required"),
  v.literal("refused"),
  v.literal("unable"),
  v.literal("missed")
);

const Shift = v.union(v.literal("AM"), v.literal("PM"), v.literal("Night"));

const AssistanceLevel = v.union(
  v.literal("independent"),
  v.literal("prompting"),
  v.literal("supervision"),
  v.literal("one_carer"),
  v.literal("two_carers"),
  v.literal("hoist_or_mechanical")
);

const ReasonCode = v.union(
  v.literal("resident_refused"),
  v.literal("asleep"),
  v.literal("off_site"),
  v.literal("hospital"),
  v.literal("end_of_life_care"),
  v.literal("clinical_hold"),
  v.literal("behavioural_risk"),
  v.literal("equipment_fault"),
  v.literal("unsafe_to_proceed"),
  v.literal("not_in_care_plan"),
  v.literal("other")
);

const Issue = v.object({
  code: v.string(),
  description: v.optional(v.string()),
  severity: v.optional(
    v.union(v.literal("low"), v.literal("moderate"), v.literal("high"))
  ),
  bodyMapRef: v.optional(v.string())
});

const CareFileName = v.union(
  v.literal("pre-admission"),
  v.literal("admission")
);

export default defineSchema({
  users: defineTable({
    // Better Auth user data
    email: v.string(), // Save email from Better Auth
    name: v.optional(v.string()), // Save name from Better Auth
    image: v.optional(v.string()), // Save image from Better Auth
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isOnboardingComplete: v.optional(v.boolean()),
    activeTeamId: v.optional(v.string())
  }).index("byEmail", ["email"]), // Add index for email lookups

  // Passkey table for better-auth passkey plugin
  passkey: defineTable({
    id: v.string(), // Unique identifier for each passkey
    name: v.optional(v.string()), // The name of the passkey
    publicKey: v.string(), // The public key of the passkey
    userId: v.string(), // The ID of the user (foreign key)
    credentialID: v.string(), // The unique identifier of the registered credential
    counter: v.number(), // The counter of the passkey
    deviceType: v.string(), // The type of device used to register the passkey
    backedUp: v.boolean(), // Whether the passkey is backed up
    transports: v.string(), // The transports used to register the passkey
    createdAt: v.number(), // The time when the passkey was created (timestamp)
    aaguid: v.optional(v.string()) // Authenticator's Attestation GUID
  })
    .index("byId", ["id"])
    .index("byUserId", ["userId"])
    .index("byCredentialID", ["credentialID"]),

  files: defineTable({
    body: v.id("_storage"),
    name: v.optional(v.string()),
    originalName: v.optional(v.string()),
    size: v.optional(v.number()),
    extension: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.optional(v.number()),
    organizationId: v.optional(v.string()),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    isPublic: v.optional(v.boolean()),
    labels: v.optional(v.array(v.string())),
    userId: v.string(),
    format: v.string(),
    type: v.union(
      v.literal("profile"),
      v.literal("organization"),
      v.literal("resident"),
      v.literal("file")
    )
  })
    .index("byUserId", ["userId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byParentFolderId", ["parentFolderId"])
    .index("byLabels", ["labels"])
    .index("byType", ["type"]),

  labels: defineTable({
    name: v.string(),
    color: v.string(),
    organizationId: v.string()
  })
    .index("byName", ["name"])
    .index("byOrganizationId", ["organizationId"]),

  folders: defineTable({
    name: v.string(),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    createdBy: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
    lastModified: v.number()
  })
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byParentFolderId", ["parentFolderId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byName", ["name"]),

  teamMembers: defineTable({
    userId: v.string(),
    teamId: v.string(),
    organizationId: v.string(),
    role: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string()
  })
    .index("byUserId", ["userId"])
    .index("byTeamId", ["teamId"])
    .index("byUserAndTeam", ["userId", "teamId"])
    .index("byOrganization", ["organizationId"]),

  residents: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    imageUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.string(),
    nhsHealthNumber: v.optional(v.string()),
    healthConditions: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            condition: v.string()
          })
        )
      )
    ),
    risks: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            risk: v.string(),
            level: v.optional(
              v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
            )
          })
        )
      )
    ),
    dependencies: v.optional(
      v.union(
        v.array(v.string()), // Legacy format for backward compatibility
        v.object({
          mobility: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          eating: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          dressing: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          toileting: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          )
        })
      )
    ),
    organizationId: v.string(),
    teamId: v.string(),
    teamName: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.optional(v.boolean())
  })
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byRoomNumber", ["roomNumber"])
    .index("byFullName", ["firstName", "lastName"])
    .index("byActiveStatus", ["isActive"]),

  // Emergency contacts for residents
  emergencyContacts: defineTable({
    residentId: v.id("residents"),
    name: v.string(),
    phoneNumber: v.string(),
    relationship: v.string(),
    isPrimary: v.optional(v.boolean()),
    organizationId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("byResidentId", ["residentId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byPrimary", ["isPrimary"]),

  medication: defineTable({
    residentId: v.optional(v.string()),
    name: v.string(),
    strength: v.string(),
    strengthUnit: v.union(v.literal("mg"), v.literal("g")),
    totalCount: v.number(),
    dosageForm: v.union(
      v.literal("Tablet"),
      v.literal("Capsule"),
      v.literal("Liquid"),
      v.literal("Injection"),
      v.literal("Cream"),
      v.literal("Ointment"),
      v.literal("Patch"),
      v.literal("Inhaler")
    ),
    route: v.union(
      v.literal("Oral"),
      v.literal("Topical"),
      v.literal("Intramuscular (IM)"),
      v.literal("Intravenous (IV)"),
      v.literal("Subcutaneous"),
      v.literal("Inhalation"),
      v.literal("Rectal"),
      v.literal("Sublingual")
    ),
    frequency: v.union(
      v.literal("Once daily (OD)"),
      v.literal("Twice daily (BD)"),
      v.literal("Three times daily (TD)"),
      v.literal("Four times daily (QDS)"),
      v.literal("Four times daily (QIS)"),
      v.literal("As Needed (PRN)"),
      v.literal("One time (STAT)"),
      v.literal("Weekly"),
      v.literal("Monthly")
    ),
    scheduleType: v.union(v.literal("Scheduled"), v.literal("PRN (As Needed)")),
    times: v.array(v.string()),
    instructions: v.optional(v.string()),
    prescriberName: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    createdByUserId: v.string(),
    teamId: v.string(),
    organizationId: v.string()
  })
    .index("byTeamId", ["teamId"])
    .index("byResidentId", ["residentId"]),

  // Medication intake tracking
  medicationIntake: defineTable({
    medicationId: v.id("medication"),
    residentId: v.string(),
    scheduledTime: v.number(),
    poppedOutAt: v.optional(v.number()),
    poppedOutByUserId: v.optional(v.string()),
    state: v.union(
      v.literal("scheduled"),
      v.literal("dispensed"),
      v.literal("administered"),
      v.literal("missed"),
      v.literal("refused"),
      v.literal("skipped")
    ),
    stateModifiedByUserId: v.optional(v.string()),
    stateModifiedAt: v.optional(v.number()),
    witnessByUserId: v.optional(v.string()),
    witnessAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("byMedicationId", ["medicationId"])
    .index("byResidentId", ["residentId"])
    .index("byScheduledTime", ["scheduledTime"])
    .index("byState", ["state"])
    .index("byTeamId", ["teamId"])
    .index("byOrganizationId", ["organizationId"])
    .index("byPoppedOutBy", ["poppedOutByUserId"])
    .index("byStateModifiedBy", ["stateModifiedByUserId"]),

  // Day-level document
  personalCareDaily: defineTable({
    residentId: v.id("residents"),
    date: v.string(), // "YYYY-MM-DD"
    shift: v.optional(Shift), // if you log per shift

    status: v.union(
      v.literal("open"),
      v.literal("partial"),
      v.literal("complete"),
      v.literal("cancelled")
    ),

    exceptions: v.optional(
      v.array(
        v.object({
          code: ReasonCode,
          note: v.optional(v.string()),
          recordedAt: v.string(), // ISO
          recordedBy: v.id("users")
        })
      )
    ),

    createdBy: v.id("users"),
    createdAt: v.number(), // Date.now()
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number())
  })
    .index("by_resident_date", ["residentId", "date"])
    .index("by_date", ["date"]),

  // Append-only task "events" (recommended for concurrency & audit)
  personalCareTaskEvents: defineTable({
    dailyId: v.id("personalCareDaily"),
    taskType: v.string(), // "morning_wash" | "dressed" | "nail_care" | "incontinence" | "hair_brushed" | "bedrails"
    status: TaskStatus,

    // common fields
    shift: v.optional(Shift),
    scheduledFor: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    performedBy: v.id("users"),
    coWorkers: v.optional(v.array(v.id("users"))),
    assistanceLevel: v.optional(AssistanceLevel),
    reasonCode: v.optional(ReasonCode),
    reasonNote: v.optional(v.string()),
    notes: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("files"))),
    links: v.optional(
      v.object({
        bmEntryId: v.optional(v.id("bmEntries")),
        woundEntryId: v.optional(v.id("wounds")),
        incidentId: v.optional(v.id("incidents"))
      })
    ),
    issues: v.optional(v.array(Issue)),

    // type-specific payload (keep flexible)
    payload: v.optional(v.any()),

    createdAt: v.number() // Date.now()
  }).index("by_daily", ["dailyId"]),

  // Diet information for residents
  dietInformation: defineTable({
    residentId: v.id("residents"),
    dietTypes: v.optional(v.array(v.string())),
    otherDietType: v.optional(v.string()),
    culturalRestrictions: v.optional(v.string()),
    allergies: v.optional(v.array(v.object({
      allergy: v.string()
    }))),
    chokingRisk: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    foodConsistency: v.optional(v.union(
      v.literal("level7"), // Easy Chew
      v.literal("level6"), // Soft & Bite-sized  
      v.literal("level5"), // Minced & Moist
      v.literal("level4"), // Pureed
      v.literal("level3")  // Liquidised
    )),
    fluidConsistency: v.optional(v.union(
      v.literal("level0"), // Thin
      v.literal("level1"), // Slightly Thick
      v.literal("level2"), // Mildly Thick
      v.literal("level3"), // Moderately Thick
      v.literal("level4")  // Extremely Thick
    )),
    assistanceRequired: v.optional(v.union(v.literal("yes"), v.literal("no"))),
    organizationId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number())
  })
    .index("byResidentId", ["residentId"])
    .index("byOrganizationId", ["organizationId"]),

  // Food and fluid logs for residents
  foodFluidLogs: defineTable({
    residentId: v.id("residents"),
    timestamp: v.number(), // exact time (Date.now())
    section: v.string(), // "midnight-7am", "7am-12pm", "12pm-5pm", "5pm-midnight"
    typeOfFoodDrink: v.string(), // "Tea", "Toast", "Chicken"
    portionServed: v.string(), // "1 slice", "2 scoops"
    amountEaten: v.string(), // "None", "1/4", "1/2", "3/4", "All"
    fluidConsumedMl: v.optional(v.number()), // e.g., 150
    signature: v.string(), // staff name/id
    date: v.string(), // "YYYY-MM-DD" for easier querying
    isArchived: v.optional(v.boolean()), // true if archived at 7am
    archivedAt: v.optional(v.number()), // timestamp when archived
    organizationId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  })
    .index("byResidentId", ["residentId"])
    .index("byResidentAndDate", ["residentId", "date"])
    .index("byDateAndArchived", ["date", "isArchived"])
    .index("byOrganizationId", ["organizationId"])
    .index("bySection", ["section"])
    .index("bySignature", ["signature"]),

  // Quick care notes for residents
  quickCareNotes: defineTable({
    residentId: v.id("residents"),
    category: v.union(
      // Old categories for backward compatibility
      v.literal("bed_safety"),
      v.literal("positioning"),
      v.literal("mobility"),
      v.literal("shower"),
      v.literal("communication"),
      // New structured categories
      v.literal("shower_bath"),
      v.literal("toileting"),
      v.literal("mobility_positioning"),
      v.literal("safety_alerts")
    ),
    
    // Shower/Bath Preference fields
    showerOrBath: v.optional(v.union(v.literal("shower"), v.literal("bath"))),
    preferredTime: v.optional(v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening"))),
    
    // Toileting Needs fields
    toiletType: v.optional(v.union(v.literal("toilet"), v.literal("commode"), v.literal("pad"))),
    assistanceLevel: v.optional(v.union(v.literal("independent"), v.literal("1_staff"), v.literal("2_staff"))),
    
    // Mobility & Positioning fields
    walkingAid: v.optional(v.union(v.literal("frame"), v.literal("stick"), v.literal("wheelchair"), v.literal("none"))),
    
    // Communication Needs fields (multiple can be selected)
    communicationNeeds: v.optional(v.array(v.union(
      v.literal("hearing_aid"),
      v.literal("glasses"),
      v.literal("non_verbal"),
      v.literal("memory_support")
    ))),
    
    // Safety Alerts fields (multiple can be selected)
    safetyAlerts: v.optional(v.array(v.union(
      v.literal("high_falls_risk"),
      v.literal("no_unattended_bathroom"),
      v.literal("chair_bed_alarm")
    ))),
    
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    isActive: v.optional(v.boolean()), // true by default, can be deactivated
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number())
  })
    .index("byResidentId", ["residentId"])
    .index("byCategory", ["category"])
    .index("byResidentAndCategory", ["residentId", "category"])
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
    .index("byActiveStatus", ["isActive"])
    .index("byCreatedBy", ["createdBy"]),

  preAdmissionCareFiles: defineTable({
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    savedAsDraft: v.boolean(),
    // Header information
    consentAcceptedAt: v.number(),
    careHomeName: v.string(),
    nhsHealthCareNumber: v.string(),
    userName: v.string(),
    jobRole: v.string(),
    date: v.number(),
    // Resident information
    firstName: v.string(),
    lastName: v.string(),
    address: v.string(),
    phoneNumber: v.string(),
    ethnicity: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    religion: v.string(),
    dateOfBirth: v.string(),
    // Next of kin
    kinFirstName: v.string(),
    kinLastName: v.string(),
    kinRelationship: v.string(),
    kinPhoneNumber: v.string(),
    // Professional contacts
    careManagerName: v.string(),
    careManagerPhoneNumber: v.string(),
    districtNurseName: v.string(),
    districtNursePhoneNumber: v.string(),
    generalPractitionerName: v.string(),
    generalPractitionerPhoneNumber: v.string(),
    providerHealthcareInfoName: v.string(),
    providerHealthcareInfoDesignation: v.string(),
    // Medical information
    allergies: v.string(),
    medicalHistory: v.string(),
    medicationPrescribed: v.string(),
    // Assessment
    consentCapacityRights: v.string(),
    medication: v.string(),
    mobility: v.string(),
    nutrition: v.string(),
    continence: v.string(),
    hygieneDressing: v.string(),
    skin: v.string(),
    cognition: v.string(),
    infection: v.string(),
    breathing: v.string(),
    alteredStateOfConsciousness: v.string(),
    // Palliative and End of life care
    dnacpr: v.boolean(),
    advancedDecision: v.boolean(),
    capacity: v.boolean(),
    advancedCarePlan: v.boolean(),
    comments: v.string(),
    // Preferences
    roomPreferences: v.string(),
    admissionContact: v.string(),
    foodPreferences: v.string(),
    preferedName: v.string(),
    familyConcerns: v.string(),
    // Other information
    otherHealthCareProfessional: v.string(),
    equipment: v.string(),
    // Financial
    attendFinances: v.boolean(),
    // Additional considerations
    additionalConsiderations: v.string(),
    // Outcome
    outcome: v.string(), // Dont know if is string or boolean or union
    plannedAdmissionDate: v.optional(v.number()),
    // Utils
    createdAt: v.number(),
    createdBy: v.id("users"),
    pdfFileId: v.optional(v.id("_storage"))
  }).index("by_resident", ["residentId"]),

  infectionPreventionAssessments: defineTable({
    // Reference to resident and organizational structure
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),

    // Person's details
    name: v.string(),
    dateOfBirth: v.string(),
    homeAddress: v.string(),
    assessmentType: v.union(v.literal("Pre-admission"), v.literal("Admission")),
    informationProvidedBy: v.optional(v.string()),
    admittedFrom: v.optional(v.string()),
    consultantGP: v.optional(v.string()),
    reasonForAdmission: v.optional(v.string()),
    dateOfAdmission: v.optional(v.string()),

    // Acute Respiratory Illness (ARI)
    newContinuousCough: v.boolean(),
    worseningCough: v.boolean(),
    temperatureHigh: v.boolean(),
    otherRespiratorySymptoms: v.optional(v.string()),
    testedForCovid19: v.boolean(),
    testedForInfluenzaA: v.boolean(),
    testedForInfluenzaB: v.boolean(),
    testedForRespiratoryScreen: v.boolean(),
    influenzaB: v.boolean(),
    respiratoryScreen: v.boolean(),
    // Exposure
    exposureToPatientsCovid: v.boolean(),
    exposureToStaffCovid: v.boolean(),
    isolationRequired: v.boolean(),
    isolationDetails: v.optional(v.string()),
    furtherTreatmentRequired: v.boolean(),

    // Infective Diarrhoea / Vomiting
    diarrheaVomitingCurrentSymptoms: v.boolean(),
    diarrheaVomitingContactWithOthers: v.boolean(),
    diarrheaVomitingFamilyHistory72h: v.boolean(),

    // Clostridium Difficile
    clostridiumActive: v.boolean(),
    clostridiumHistory: v.boolean(),
    clostridiumStoolCount72h: v.optional(v.string()),
    clostridiumLastPositiveSpecimenDate: v.optional(v.string()),
    clostridiumResult: v.optional(v.string()),
    clostridiumTreatmentReceived: v.optional(v.string()),
    clostridiumTreatmentComplete: v.optional(v.boolean()),
    ongoingDetails: v.optional(v.string()),
    ongoingDateCommenced: v.optional(v.string()),
    ongoingLengthOfCourse: v.optional(v.string()),
    ongoingFollowUpRequired: v.optional(v.string()),

    // MRSA / MSSA
    mrsaMssaColonised: v.boolean(),
    mrsaMssaInfected: v.boolean(),
    mrsaMssaLastPositiveSwabDate: v.optional(v.string()),
    mrsaMssaSitesPositive: v.optional(v.string()),
    mrsaMssaTreatmentReceived: v.optional(v.string()),
    mrsaMssaTreatmentComplete: v.optional(v.string()),
    mrsaMssaDetails: v.optional(v.string()),
    mrsaMssaDateCommenced: v.optional(v.string()),
    mrsaMssaLengthOfCourse: v.optional(v.string()),
    mrsaMssaFollowUpRequired: v.optional(v.string()),

    // Multi-drug resistant organisms
    esbl: v.boolean(),
    vreGre: v.boolean(),
    cpe: v.boolean(),
    otherMultiDrugResistance: v.optional(v.string()),
    relevantInformationMultiDrugResistance: v.optional(v.string()),

    // Other Information
    awarenessOfInfection: v.boolean(),
    lastFluVaccinationDate: v.optional(v.string()),

    // Assessment Completion
    completedBy: v.string(),
    jobRole: v.string(),
    signature: v.string(),
    completionDate: v.string(),

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    savedAsDraft: v.optional(v.boolean()),
    pdfFileId: v.optional(v.id("_storage"))
  })
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"])
    .index("by_assessment_type", ["assessmentType"])
    .index("by_completion_date", ["completionDate"])
});
