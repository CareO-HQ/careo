import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  dependencyAssessments,
  dnacprs,
  peeps,
  photographyConsents,
  residentValuablesAssessments,
  skinIntegrityAssessments,
  timlAssessments
} from "./schemas/carefiles";
import { managerAuditsValidator } from "./schemas/managerAudits";

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

const ToiletingPattern = v.union(
  v.literal("TOILET"),
  v.literal("COMMODE"),
  v.literal("BED-PAN"),
  v.literal("URINAL")
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
    // GP Details
    gpName: v.optional(v.string()),
    gpAddress: v.optional(v.string()),
    gpPhone: v.optional(v.string()),
    // Care Manager Details
    careManagerName: v.optional(v.string()),
    careManagerAddress: v.optional(v.string()),
    careManagerPhone: v.optional(v.string()),
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
    address: v.optional(v.string()),
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
    allergies: v.optional(
      v.array(
        v.object({
          allergy: v.string()
        })
      )
    ),
    chokingRisk: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    foodConsistency: v.optional(
      v.union(
        v.literal("level7"), // Easy Chew
        v.literal("level6"), // Soft & Bite-sized
        v.literal("level5"), // Minced & Moist
        v.literal("level4"), // Pureed
        v.literal("level3") // Liquidised
      )
    ),
    fluidConsistency: v.optional(
      v.union(
        v.literal("level0"), // Thin
        v.literal("level1"), // Slightly Thick
        v.literal("level2"), // Mildly Thick
        v.literal("level3"), // Moderately Thick
        v.literal("level4") // Extremely Thick
      )
    ),
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
    .index("bySignature", ["signature"])
    .index("by_resident_timestamp", ["residentId", "timestamp"]) // For date range queries
    .index("by_resident_archived", ["residentId", "isArchived", "timestamp"]) // For filtering archived
    .index("by_organization_date", ["organizationId", "date"]) // For org-level reports
    .index("by_archived_date", ["isArchived", "archivedAt"]), // For auto-archive cleanup

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
      v.literal("mobility_positioning"), // Keep for existing records
      // New structured categories
      v.literal("shower_bath"),
      v.literal("toileting"),
      v.literal("mobility_only"),
      v.literal("positioning_only"),
      v.literal("safety_alerts")
    ),

    // Shower/Bath Preference fields
    showerOrBath: v.optional(v.union(v.literal("shower"), v.literal("bath"))),
    preferredTime: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening")
      )
    ),

    // Toileting Needs fields
    toiletType: v.optional(
      v.union(v.literal("toilet"), v.literal("commode"), v.literal("pad"))
    ),
    assistanceLevel: v.optional(
      v.union(
        v.literal("independent"),
        v.literal("1_staff"),
        v.literal("2_staff")
      )
    ),

    // Mobility & Positioning fields
    walkingAid: v.optional(
      v.union(
        v.literal("frame"),
        v.literal("stick"),
        v.literal("wheelchair"),
        v.literal("none")
      )
    ),

    // Positioning frequency field
    positioningFrequency: v.optional(
      v.union(
        v.literal("every_hour"),
        v.literal("every_2_hours"),
        v.literal("every_4_hours"),
        v.literal("every_5_hours"),
        v.literal("every_6_hours")
      )
    ),

    // Communication Needs fields (multiple can be selected)
    communicationNeeds: v.optional(
      v.array(
        v.union(
          v.literal("hearing_aid"),
          v.literal("glasses"),
          v.literal("non_verbal"),
          v.literal("memory_support")
        )
      )
    ),

    // Safety Alerts fields (multiple can be selected)
    safetyAlerts: v.optional(
      v.array(
        v.union(
          v.literal("high_falls_risk"),
          v.literal("no_unattended_bathroom"),
          v.literal("chair_bed_alarm")
        )
      )
    ),

    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
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

  // Appointment notes for residents
  appointmentNotes: defineTable({
    residentId: v.id("residents"),
    category: v.union(
      v.literal("preparation"),
      v.literal("preferences"),
      v.literal("special_instructions"),
      v.literal("transportation"),
      v.literal("medical_requirements")
    ),

    // Preparation fields
    preparationTime: v.optional(
      v.union(
        v.literal("30_minutes"),
        v.literal("1_hour"),
        v.literal("2_hours")
      )
    ),
    preparationNotes: v.optional(v.string()),

    // Preferences fields
    preferredTime: v.optional(
      v.union(
        v.literal("morning"),
        v.literal("afternoon"),
        v.literal("evening")
      )
    ),
    transportPreference: v.optional(
      v.union(
        v.literal("wheelchair"),
        v.literal("walking_aid"),
        v.literal("independent"),
        v.literal("stretcher")
      )
    ),

    // Special instructions
    instructions: v.optional(v.string()),

    // Transportation requirements
    transportationNeeds: v.optional(
      v.array(
        v.union(
          v.literal("wheelchair_accessible"),
          v.literal("oxygen_support"),
          v.literal("medical_equipment"),
          v.literal("assistance_required")
        )
      )
    ),

    // Medical requirements
    medicalNeeds: v.optional(
      v.array(
        v.union(
          v.literal("fasting_required"),
          v.literal("medication_adjustment"),
          v.literal("blood_work"),
          v.literal("vitals_check")
        )
      )
    ),

    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    isActive: v.optional(v.boolean()),
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

  // Appointments for residents
  appointments: defineTable({
    residentId: v.id("residents"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // ISO date-time string
    endTime: v.string(), // ISO date-time string
    location: v.string(),
    staffId: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number())
  })
    .index("byResidentId", ["residentId"])
    .index("byStatus", ["status"])
    .index("byStartTime", ["startTime"])
    .index("byOrganizationId", ["organizationId"])
    .index("byTeamId", ["teamId"])
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
    .index("by_completion_date", ["completionDate"]),

  bladderBowelAssessments: defineTable({
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Section 1 - Resident info
    residentName: v.string(),
    dateOfBirth: v.number(),
    bedroomNumber: v.string(),
    informationObtainedFrom: v.string(),

    // Section 2 - Infections
    hepatitisAB: v.optional(v.boolean()),
    bloodBorneVirues: v.optional(v.boolean()),
    mrsa: v.optional(v.boolean()),
    esbl: v.optional(v.boolean()),
    other: v.optional(v.string()),

    // Section 3 - Urinalysis on Admission
    ph: v.optional(v.boolean()),
    nitrates: v.optional(v.boolean()),
    protein: v.optional(v.boolean()),
    leucocytes: v.optional(v.boolean()),
    glucose: v.optional(v.boolean()),
    bloodResult: v.optional(v.boolean()),
    mssuDate: v.optional(v.number()),

    // Section 4 - Prescribed medication
    antiHypertensives: v.optional(v.boolean()),
    antiParkinsonDrugs: v.optional(v.boolean()),
    ironSupplement: v.optional(v.boolean()),
    laxatives: v.optional(v.boolean()),
    diuretics: v.optional(v.boolean()),
    histamine: v.optional(v.boolean()),
    antiDepressants: v.optional(v.boolean()),
    cholinergic: v.optional(v.boolean()),
    sedativesHypnotic: v.optional(v.boolean()),
    antiPsychotic: v.optional(v.boolean()),
    antihistamines: v.optional(v.boolean()),
    narcoticAnalgesics: v.optional(v.boolean()),

    // Section 5 - Lifestyle
    caffeineMls24h: v.optional(v.number()),
    caffeineFrequency: v.optional(v.string()),
    caffeineTimeOfDay: v.optional(v.string()),
    excersiceType: v.optional(v.string()),
    excersiceFrequency: v.optional(v.string()),
    excersiceTimeOfDay: v.optional(v.string()),
    alcoholAmount24h: v.optional(v.number()),
    alcoholFrequency: v.optional(v.string()),
    alcoholTimeOfDay: v.optional(v.string()),
    smoking: v.union(
      v.literal("SMOKER"),
      v.literal("NON-SMOKER"),
      v.literal("EX-SMOKER")
    ),
    weight: v.union(
      v.literal("NORMAL"),
      v.literal("OBESE"),
      v.literal("UNDERWEIGHT")
    ),
    skinCondition: v.union(
      v.literal("HEALTHY"),
      v.literal("RED"),
      v.literal("EXCORIATED"),
      v.literal("BROKEN")
    ),
    constipationHistory: v.optional(v.boolean()),
    mentalState: v.union(
      v.literal("ALERT"),
      v.literal("CONFUSED"),
      v.literal("LEARNING-DISABLED"),
      v.literal("COGNITIVELY-IMPAIRED")
    ),
    mobilityIssues: v.union(
      v.literal("INDEPENDENT"),
      v.literal("ASSISTANCE"),
      v.literal("HOISTED")
    ),
    historyRecurrentUTIs: v.optional(v.boolean()),

    // Section 6 - Urinari continence
    incontinence: v.union(
      v.literal("NONE"),
      v.literal("ONE"),
      v.literal("1-2DAY"),
      v.literal("3DAY"),
      v.literal("NIGHT"),
      v.literal("DAYANDNIGHT")
    ),
    volume: v.union(
      v.literal("ENTIRE-BLADDER"),
      v.literal("SMALL-VOL"),
      v.literal("UNABLE-DETERMINE")
    ),
    onset: v.union(v.literal("SUDDEN"), v.literal("GRADUAL")),
    duration: v.union(
      v.literal("LESS-6M"),
      v.literal("6M-1Y"),
      v.literal("MORE-1Y")
    ),
    symptompsLastSix: v.union(
      v.literal("STABLE"),
      v.literal("WORSENING"),
      v.literal("IMPROVING"),
      v.literal("FLUCTUATING")
    ),
    physicianConsulted: v.optional(v.boolean()),

    // Section 7 - Bowel pattern
    bowelState: v.union(
      v.literal("NORMAL"),
      v.literal("CONSTIPATION"),
      v.literal("DIARRHOEA"),
      v.literal("STOMA"),
      v.literal("FAECAL-INCONTINENCE"),
      v.literal("IRRITABLE-BOWEL")
    ),
    bowelFrequency: v.string(),
    usualTimeOfDat: v.string(),
    amountAndStoolType: v.string(),
    liquidFeeds: v.string(),
    otherFactors: v.string(),
    otherRemedies: v.string(),
    medicalOfficerConsulted: v.optional(v.boolean()),

    // Section 8 - Current toileting pattern and products in use
    // TODO: I thinks is only one option.
    dayPattern: ToiletingPattern,
    eveningPattern: ToiletingPattern,
    nightPattern: ToiletingPattern,
    typesOfPads: v.string(),

    // Section 9 - Symptoms
    // 9.A -> If any is true, show to do another plan
    leakCoughLaugh: v.optional(v.boolean()),
    leakStandingUp: v.optional(v.boolean()),
    leakUpstairsDownhill: v.optional(v.boolean()),
    passesUrineFrequently: v.optional(v.boolean()),
    desirePassUrine: v.optional(v.boolean()),
    leaksBeforeToilet: v.optional(v.boolean()),
    moreThanTwiceAtNight: v.optional(v.boolean()),
    anxiety: v.optional(v.boolean()),
    // 9.B ->  If any is true, show to do another plan
    difficultyStarting: v.optional(v.boolean()),
    hesintancy: v.optional(v.boolean()),
    dribbles: v.optional(v.boolean()),
    feelsFull: v.optional(v.boolean()),
    recurrentTractInfections: v.optional(v.boolean()),
    // 9.C ->  If any is true, show to do another plan
    limitedMobility: v.optional(v.boolean()),
    unableOnTime: v.optional(v.boolean()),
    notHoldUrinalOrSeat: v.optional(v.boolean()),
    notuseCallBell: v.optional(v.boolean()),
    poorVision: v.optional(v.boolean()),
    assistedTransfer: v.optional(v.boolean()),
    pain: v.optional(v.boolean()),

    // Section 10
    // Bladder
    bladderContinent: v.optional(v.boolean()),
    bladderIncontinent: v.optional(v.boolean()),
    bladderIncontinentType: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("FUNCTIONAL")
    ),
    bladderPlanCommenced: v.optional(v.boolean()),
    bladderReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("CONTINENCE-NURSE"),
      v.literal("NONE")
    ),
    bladderPlanFollowed: v.union(
      v.literal("STRESS"),
      v.literal("URGE"),
      v.literal("MIXED"),
      v.literal("RETENTION-OVERFLOW")
    ),
    // Bowel
    bowelContinent: v.optional(v.boolean()),
    bowelIncontinent: v.optional(v.boolean()),
    bowelPlanCommenced: v.optional(v.boolean()),
    bowelRecordCommenced: v.optional(v.boolean()),
    bowelReferralRequired: v.union(
      v.literal("DIETICIAN"),
      v.literal("GP"),
      v.literal("OT"),
      v.literal("PHYSIOTHERAPIST"),
      v.literal("NONE")
    ),

    // Section 11
    sigantureCompletingAssessment: v.string(),
    sigantureResident: v.optional(v.string()),
    dateNextReview: v.number(),

    // Metadata
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    savedAsDraft: v.optional(v.boolean()),
    pdfFileId: v.optional(v.id("_storage"))
  }).index("by_resident", ["residentId"]),

  movingHandlingAssessments: defineTable({
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Section 1: Resident information
    residentName: v.string(),
    dateOfBirth: v.number(),
    bedroomNumber: v.string(),
    weight: v.number(),
    height: v.number(),
    historyOfFalls: v.boolean(),

    // Section 2: Mobility Assessment
    independentMobility: v.boolean(),
    canWeightBear: v.union(
      v.literal("FULLY"),
      v.literal("PARTIALLY"),
      v.literal("WITH-AID"),
      v.literal("NO-WEIGHTBEARING")
    ),
    limbUpperRight: v.union(
      v.literal("FULLY"),
      v.literal("PARTIALLY"),
      v.literal("NONE")
    ),
    limbUpperLeft: v.union(
      v.literal("FULLY"),
      v.literal("PARTIALLY"),
      v.literal("NONE")
    ),
    limbLowerRight: v.union(
      v.literal("FULLY"),
      v.literal("PARTIALLY"),
      v.literal("NONE")
    ),
    limbLowerLeft: v.union(
      v.literal("FULLY"),
      v.literal("PARTIALLY"),
      v.literal("NONE")
    ),
    equipmentUsed: v.optional(v.string()),
    needsRiskStaff: v.optional(v.string()),

    // Section 3: Sensory and Behavioral Risk Factors
    deafnessState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    deafnessComments: v.optional(v.string()),
    blindnessState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    blindnessComments: v.optional(v.string()),
    unpredictableBehaviourState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    unpredictableBehaviourComments: v.optional(v.string()),
    uncooperativeBehaviourState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    uncooperativeBehaviourComments: v.optional(v.string()),

    // Section 4: Cognitive and Emotional Risk Factors
    distressedReactionState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    distressedReactionComments: v.optional(v.string()),
    disorientatedState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    disorientatedComments: v.optional(v.string()),
    unconsciousState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    unconsciousComments: v.optional(v.string()),
    unbalanceState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    unbalanceComments: v.optional(v.string()),

    // Section 5: Physical Risk Factors
    spasmsState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    spasmsComments: v.optional(v.string()),
    stiffnessState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    stiffnessComments: v.optional(v.string()),
    cathetersState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    cathetersComments: v.optional(v.string()),
    incontinenceState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    incontinenceComments: v.optional(v.string()),

    // Section 6: Additional Risk Factors
    localisedPain: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    localisedPainComments: v.optional(v.string()),
    otherState: v.union(
      v.literal("ALWAYS"),
      v.literal("SOMETIMES"),
      v.literal("NEVER")
    ),
    otherComments: v.optional(v.string()),

    // Section 7: Assessment Completion
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
  }).index("by_resident", ["residentId"]),

  incidents: defineTable({
    // Section 1: Incident Details (all required in form)
    date: v.string(), // Required - date of incident
    time: v.string(), // Required - time of incident
    homeName: v.string(), // Required - home name
    unit: v.string(), // Required - unit

    // Section 2: Injured Person Details
    injuredPersonFirstName: v.string(), // Required - first name
    injuredPersonSurname: v.string(), // Required - surname
    injuredPersonDOB: v.string(), // Required - date of birth
    residentId: v.optional(v.id("residents")), // Auto-filled from context
    residentInternalId: v.optional(v.string()), // Optional - internal ID
    dateOfAdmission: v.optional(v.string()), // Optional - admission date
    healthCareNumber: v.optional(v.string()), // Optional - healthcare number

    // Section 3: Status of Injured Person (multiple can be selected)
    injuredPersonStatus: v.optional(v.array(v.string())), // Array of status values: "Resident", "Relative", "Staff", "AgencyStaff", "Visitor", "Contractor"
    contractorEmployer: v.optional(v.string()), // Only filled if "Contractor" is selected

    // Section 4: Type of Incident (multiple can be selected)
    incidentTypes: v.array(v.string()), // Array of incident types - required
    typeOtherDetails: v.optional(v.string()), // Details if "Other" is selected

    // Section 5-6: Fall-Specific Questions
    anticoagulantMedication: v.optional(v.string()), // "yes", "no", "unknown"
    fallPathway: v.optional(v.string()), // "green", "amber", "red"

    // Section 7: Detailed Description
    detailedDescription: v.string(), // Required - detailed description (min 10 chars in form)

    // Section 8: Incident Level
    incidentLevel: v.string(), // Required - "death", "permanent_harm", "minor_injury", "no_harm", "near_miss"

    // Section 9: Details of Injury
    injuryDescription: v.optional(v.string()),
    bodyPartInjured: v.optional(v.string()),

    // Section 10: Treatment Required
    treatmentTypes: v.optional(v.array(v.string())), // Array of treatment types selected

    // Section 11: Details of Treatment Given
    treatmentDetails: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
    treatmentRefused: v.optional(v.boolean()),

    // Section 12: Witnesses
    witness1Name: v.optional(v.string()),
    witness1Contact: v.optional(v.string()),
    witness2Name: v.optional(v.string()),
    witness2Contact: v.optional(v.string()),

    // Section 13: Further Actions by Nurse
    nurseActions: v.optional(v.array(v.string())), // Array of nurse actions taken

    // Section 14: Further Actions Advised
    furtherActionsAdvised: v.optional(v.string()),

    // Section 15: Prevention Measures
    preventionMeasures: v.optional(v.string()),

    // Section 16: Home Manager Informed
    homeManagerInformedBy: v.optional(v.string()),
    homeManagerInformedDateTime: v.optional(v.string()),

    // Section 17: Out of Hours On-Call
    onCallManagerName: v.optional(v.string()),
    onCallContactedDateTime: v.optional(v.string()),

    // Section 18: Next of Kin Informed
    nokInformedWho: v.optional(v.string()),
    nokInformedBy: v.optional(v.string()),
    nokInformedDateTime: v.optional(v.string()),

    // Section 19: Trust Incident Form Recipients
    careManagerName: v.optional(v.string()),
    careManagerEmail: v.optional(v.string()),
    keyWorkerName: v.optional(v.string()),
    keyWorkerEmail: v.optional(v.string()),

    // Section 20: Form Completion Details
    completedByFullName: v.string(), // Required - full name of person completing form
    completedByJobTitle: v.string(), // Required - job title of person completing form
    completedBySignature: v.optional(v.string()), // Optional - digital signature
    dateCompleted: v.string(), // Required - date completed

    // Legacy fields for backward compatibility (keep for existing records)
    description: v.optional(v.string()),
    immediateAction: v.optional(v.string()),
    medicalAttention: v.optional(v.string()),
    doctorNotified: v.optional(v.boolean()),
    familyNotified: v.optional(v.boolean()),
    injuriesNoted: v.optional(v.string()),
    followUpRequired: v.optional(v.string()),
    preventativeMeasures: v.optional(v.string()),
    reportedBy: v.optional(v.string()),
    reporterRole: v.optional(v.string()),
    severity: v.optional(v.string()),
    type: v.optional(v.string()),
    location: v.optional(v.string()),
    witnesses: v.optional(v.string()),

    // Metadata
    status: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users"))
  })
    .index("by_resident", ["residentId"])
    .index("by_date", ["date"])
    .index("by_incident_level", ["incidentLevel"])
    .index("by_home", ["homeName"]),

  longTermFallsRiskAssessments: defineTable({
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    pdfFileId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    createdBy: v.string(),

    // Assessment fields
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
    savedAsDraft: v.optional(v.boolean())
  }).index("by_resident", ["residentId"]),

  managerAudits: managerAuditsValidator
    .index("by_form", ["formType", "formId"])
    .index("by_resident", ["residentId"])
    .index("by_audited_by", ["auditedBy"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"])
    .index("by_form_and_resident", ["formType", "residentId"]),

  residentAuditItems: defineTable({
    residentId: v.id("residents"),
    itemName: v.string(),
    status: v.union(
      v.literal("n/a"),
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("completed"),
      v.literal("overdue"),
      v.literal("not-applicable")
    ),
    auditorName: v.optional(v.string()),
    lastAuditedDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    teamId: v.string(),
    organizationId: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  })
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"])
    .index("by_resident_and_item", ["residentId", "itemName"]),

  photographyConsents: photographyConsents
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  dnacprs: dnacprs
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  peeps: peeps
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  dependencyAssessments: dependencyAssessments
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  timlAssessments: timlAssessments
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  skinIntegrityAssessments: skinIntegrityAssessments
    .index("by_resident", ["residentId"])
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"]),

  residentValuablesAssessments: residentValuablesAssessments,

  // Care file PDFs - for custom uploaded PDFs in specific folders

  careFilePdfs: defineTable({
    name: v.string(), // Custom name given by user (can be renamed)

    originalName: v.string(), // Original filename

    fileId: v.id("_storage"), // Reference to Convex storage

    folderName: v.string(), // Which care file folder this belongs to

    residentId: v.id("residents"),

    organizationId: v.string(),

    teamId: v.string(),

    uploadedBy: v.string(), // User ID who uploaded the file

    uploadedAt: v.number(), // Upload timestamp

    size: v.optional(v.number()), // File size in bytes

    isActive: v.optional(v.boolean()) // For soft deletion
  })
    .index("by_resident", ["residentId"])

    .index("by_folder", ["folderName"])

    .index("by_resident_and_folder", ["residentId", "folderName"])

    .index("by_organization", ["organizationId"])

    .index("by_team", ["teamId"])

    .index("by_uploaded_by", ["uploadedBy"])

    .index("by_active", ["isActive"]),

  carePlanAssessments: defineTable({
    residentId: v.id("residents"),
    previousCarePlanId: v.optional(v.id("carePlanAssessments")),

    userId: v.string(),

    // Folder association
    folderKey: v.optional(v.string()),

    // Basic information

    nameOfCarePlan: v.string(),

    residentName: v.string(),

    dob: v.number(),

    bedroomNumber: v.string(),

    writtenBy: v.string(),

    dateWritten: v.number(),

    carePlanNumber: v.string(),

    // Care plan details

    identifiedNeeds: v.string(),

    aims: v.string(),

    // Planned care entries

    plannedCareDate: v.array(
      v.object({
        date: v.number(),

        time: v.optional(v.string()),

        details: v.string(),

        signature: v.string()
      })
    ),

    // Review of Patient or Representative

    discussedWith: v.optional(v.string()),

    signature: v.optional(v.string()),

    date: v.number(),

    staffSignature: v.optional(v.string()),

    // Metadata

    status: v.union(
      v.literal("draft"),

      v.literal("submitted"),

      v.literal("reviewed")
    ),

    submittedAt: v.optional(v.number()),

    updatedAt: v.optional(v.number()),

    pdfFileId: v.optional(v.id("_storage"))
  })
    .index("by_residentId", ["residentId"])

    .index("by_userId", ["userId"])

    .index("by_status", ["status"])

    .index("by_carePlanNumber", ["carePlanNumber"])

    .index("by_date", ["date"])

    .index("by_resident_and_folder", ["residentId", "folderKey"]),

  // Hospital Passport records
  hospitalPassports: defineTable({
    residentId: v.id("residents"),

    // General & Transfer Details
    generalDetails: v.object({
      personName: v.string(),
      knownAs: v.string(),
      dateOfBirth: v.string(),
      nhsNumber: v.string(),
      religion: v.optional(v.string()),
      weightOnTransfer: v.optional(v.string()),
      careType: v.optional(
        v.union(
          v.literal("nursing"),
          v.literal("residential"),
          v.literal("ld"),
          v.literal("mental_health")
        )
      ),
      transferDateTime: v.string(),
      accompaniedBy: v.optional(v.string()),
      englishFirstLanguage: v.union(v.literal("yes"), v.literal("no")),
      firstLanguage: v.optional(v.string()),
      careHomeName: v.string(),
      careHomeAddress: v.string(),
      careHomePhone: v.string(),
      hospitalName: v.string(),
      hospitalAddress: v.string(),
      hospitalPhone: v.optional(v.string()),
      nextOfKinName: v.string(),
      nextOfKinAddress: v.string(),
      nextOfKinPhone: v.string(),
      gpName: v.string(),
      gpAddress: v.string(),
      gpPhone: v.string(),
      careManagerName: v.optional(v.string()),
      careManagerAddress: v.optional(v.string()),
      careManagerPhone: v.optional(v.string())
    }),

    // Medical & Care Needs
    medicalCareNeeds: v.object({
      // SBAR Format
      situation: v.string(),
      background: v.string(),
      assessment: v.string(),
      recommendations: v.string(),

      // Medical History
      pastMedicalHistory: v.string(),
      knownAllergies: v.optional(v.string()),
      historyOfConfusion: v.optional(
        v.union(v.literal("yes"), v.literal("no"), v.literal("sometimes"))
      ),
      learningDisabilityMentalHealth: v.optional(v.string()),

      // Communication & Aids
      communicationIssues: v.optional(v.string()),
      hearingAid: v.boolean(),
      glasses: v.boolean(),
      otherAids: v.optional(v.string()),

      // Mobility
      mobilityAssistance: v.union(
        v.literal("independent"),
        v.literal("minimum"),
        v.literal("full")
      ),
      mobilityAids: v.optional(v.string()),
      historyOfFalls: v.boolean(),
      dateOfLastFall: v.optional(v.string()),

      // Toileting
      toiletingAssistance: v.union(
        v.literal("independent"),
        v.literal("minimum"),
        v.literal("full")
      ),
      continenceStatus: v.optional(
        v.union(
          v.literal("continent"),
          v.literal("urine"),
          v.literal("faeces"),
          v.literal("both"),
          v.literal("na")
        )
      ),

      // Nutrition
      nutritionalAssistance: v.union(
        v.literal("independent"),
        v.literal("minimum"),
        v.literal("full")
      ),
      dietType: v.optional(v.string()),
      swallowingDifficulties: v.boolean(),
      enteralNutrition: v.boolean(),
      mustScore: v.optional(v.string()),

      // Personal Care
      personalHygieneAssistance: v.union(
        v.literal("independent"),
        v.literal("minimum"),
        v.literal("full")
      ),
      topDentures: v.boolean(),
      bottomDentures: v.boolean(),
      denturesAccompanying: v.boolean()
    }),

    // Skin, Medication & Attachments
    skinMedicationAttachments: v.object({
      // Skin Care
      skinIntegrityAssistance: v.union(
        v.literal("independent"),
        v.literal("minimum"),
        v.literal("full")
      ),
      bradenScore: v.optional(v.string()),
      skinStateOnTransfer: v.string(),
      currentSkinCareRegime: v.optional(v.string()),
      pressureRelievingEquipment: v.optional(v.string()),
      knownToTVN: v.boolean(),
      tvnName: v.optional(v.string()),

      // Medication
      currentMedicationRegime: v.string(),
      lastMedicationDateTime: v.string(),
      lastMealDrinkDateTime: v.optional(v.string()),

      // Attachments
      attachments: v.object({
        currentMedications: v.boolean(),
        bodyMap: v.boolean(),
        observations: v.boolean(),
        dnacprForm: v.boolean(),
        enteralFeedingRegime: v.boolean(),
        other: v.boolean(),
        otherSpecify: v.optional(v.string())
      })
    }),

    // Sign-off Section
    signOff: v.object({
      signature: v.string(),
      printedName: v.string(),
      designation: v.string(),
      contactPhone: v.string(),
      completedDate: v.string()
    }),

    // Metadata
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    pdfFileId: v.optional(v.id("_storage")),
    status: v.union(v.literal("draft"), v.literal("completed"))
  })
    .index("by_resident", ["residentId"])
    .index("by_organization", ["organizationId"])
    .index("by_team", ["teamId"])
    .index("by_created_by", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // Hospital Transfer Logs
  hospitalTransferLogs: defineTable({
    residentId: v.id("residents"),
    date: v.string(),
    hospitalName: v.string(),
    reason: v.string(),
    outcome: v.optional(v.string()),
    followUp: v.optional(v.string()),
    filesChanged: v.optional(
      v.object({
        carePlan: v.boolean(),
        riskAssessment: v.boolean(),
        other: v.optional(v.string())
      })
    ),
    medicationChanges: v.optional(
      v.object({
        medicationsAdded: v.boolean(),
        addedMedications: v.optional(v.string()),
        medicationsRemoved: v.boolean(),
        removedMedications: v.optional(v.string()),
        medicationsModified: v.boolean(),
        modifiedMedications: v.optional(v.string())
      })
    ),

    // Metadata
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  })
    .index("by_resident", ["residentId"])
    .index("by_organization", ["organizationId"])
    .index("by_team", ["teamId"])
    .index("by_created_by", ["createdBy"])
    .index("by_date", ["date"]),

  admissionAssesments: defineTable({
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
    hygiene: v.optional(v.string()),

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
  })
    .index("by_residentId", ["residentId"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_organizationId", ["organizationId"])
    .index("by_teamId", ["teamId"])
    .index("by_createdBy", ["createdBy"]),
  progressNotes: defineTable({
    residentId: v.id("residents"),
    type: v.union(
      v.literal("daily"),
      v.literal("incident"),
      v.literal("medical"),
      v.literal("behavioral"),
      v.literal("other")
    ),
    date: v.string(),
    time: v.string(),
    note: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage")))
  })
    .index("by_residentId", ["residentId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_type", ["type"]),

  // Trust Incident Reports table
  trustIncidentReports: defineTable({
    incidentId: v.id("incidents"),
    residentId: v.id("residents"),
    trustName: v.string(),
    reportType: v.union(
      v.literal("nhs"),
      v.literal("ps1"),
      v.literal("trust_internal")
    ),
    additionalNotes: v.optional(v.string()),
    createdBy: v.string(),
    createdByName: v.string(),
    createdAt: v.string(),
    reportData: v.optional(v.any()) // Store any additional report-specific data
  })
    .index("by_incidentId", ["incidentId"])
    .index("by_residentId", ["residentId"])
    .index("by_reportType", ["reportType"]),

  // Vitals/Health Monitoring table
  vitals: defineTable({
    residentId: v.id("residents"),
    vitalType: v.union(
      v.literal("temperature"),
      v.literal("bloodPressure"),
      v.literal("heartRate"),
      v.literal("respiratoryRate"),
      v.literal("oxygenSaturation"),
      v.literal("weight"),
      v.literal("height"),
      v.literal("glucoseLevel"),
      v.literal("painLevel")
    ),
    value: v.string(),
    value2: v.optional(v.string()), // For blood pressure diastolic
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    recordedBy: v.string(),
    recordDate: v.string(),
    recordTime: v.string(),
    createdAt: v.number(),
    createdBy: v.string()
  })
    .index("byResident", ["residentId"])
    .index("byResidentAndType", ["residentId", "vitalType"])
    .index("byDate", ["recordDate"])
    .index("by_created_at", ["createdAt"]),

  // Handover Reports - archived handover sheets
  handoverReports: defineTable({
    date: v.string(), // Date of the handover (YYYY-MM-DD)
    shift: v.union(v.literal("day"), v.literal("night")), // Day or night shift
    teamId: v.string(),
    teamName: v.string(),
    organizationId: v.string(),

    // Handover data for each resident
    residentHandovers: v.array(
      v.object({
        residentId: v.id("residents"),
        residentName: v.string(),
        roomNumber: v.optional(v.string()),
        age: v.number(),

        // Report data (from handover.getHandoverReport)
        foodIntakeCount: v.number(),
        foodIntakeLogs: v.optional(
          v.array(
            v.object({
              id: v.string(),
              typeOfFoodDrink: v.optional(v.string()),
              amountEaten: v.optional(v.string()),
              section: v.optional(v.string()),
              timestamp: v.number()
            })
          )
        ),
        totalFluid: v.number(),
        fluidLogs: v.optional(
          v.array(
            v.object({
              id: v.string(),
              typeOfFoodDrink: v.optional(v.string()),
              fluidConsumedMl: v.optional(v.number()),
              section: v.optional(v.string()),
              timestamp: v.number()
            })
          )
        ),
        incidentCount: v.number(),
        incidents: v.optional(
          v.array(
            v.object({
              id: v.string(),
              type: v.array(v.string()),
              level: v.optional(v.string()),
              time: v.optional(v.string())
            })
          )
        ),
        hospitalTransferCount: v.number(),
        hospitalTransfers: v.optional(
          v.array(
            v.object({
              id: v.string(),
              hospitalName: v.optional(v.string()),
              reason: v.optional(v.string())
            })
          )
        ),

        // Comments from handover sheet
        comments: v.optional(v.string())
      })
    ),

    // Metadata
    createdBy: v.string(),
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.string()),
    updatedByName: v.optional(v.string())
  })
    .index("by_team", ["teamId"])
    .index("by_organization", ["organizationId"])
    .index("by_date", ["date"])
    .index("by_shift", ["shift"])
    .index("by_team_and_date", ["teamId", "date"])
    .index("by_created_at", ["createdAt"]),

  // Handover Comments - real-time comments during handover (before archiving)
  handoverComments: defineTable({
    teamId: v.string(),
    residentId: v.id("residents"),
    date: v.string(), // YYYY-MM-DD
    shift: v.union(v.literal("day"), v.literal("night")),
    comment: v.string(),

    // Metadata
    createdBy: v.string(), // User ID
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_team_date_shift", ["teamId", "date", "shift"])
    .index("by_resident_date", ["residentId", "date"])
    .index("by_team_resident", ["teamId", "residentId", "date"]),

  // Multidisciplinary Care Team Members
  multidisciplinaryCareTeam: defineTable({
    residentId: v.id("residents"),
    name: v.string(),
    designation: v.string(), // Job title/role
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    specialty: v.string(), // Speciality / Department
    organisation: v.optional(v.string()), // Organisation/trust
    email: v.optional(v.string()),
    isActive: v.optional(v.boolean()), // For soft deletion
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number())
  })
    .index("byResident", ["residentId"])
    .index("byOrganization", ["organizationId"])
    .index("byTeam", ["teamId"])
    .index("bySpecialty", ["specialty"])
    .index("byCreatedBy", ["createdBy"])
    .index("byActiveStatus", ["isActive"]),

  // Multidisciplinary Notes
  multidisciplinaryNotes: defineTable({
    residentId: v.id("residents"),
    teamMemberId: v.union(v.id("multidisciplinaryCareTeam"), v.string()), // Reference to team member or GP/Care Manager string ID
    teamMemberName: v.string(), // Store name for easier display
    reasonForVisit: v.string(),
    outcome: v.string(),
    relativeInformed: v.union(v.literal("yes"), v.literal("no")),
    relativeInformedDetails: v.optional(v.string()), // Who was informed and how
    signature: v.string(),
    noteDate: v.string(), // Date of the note
    noteTime: v.string(), // Time of the note
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number())
  })
    .index("byResident", ["residentId"])
    .index("byTeamMember", ["teamMemberId"])
    .index("byOrganization", ["organizationId"])
    .index("byTeam", ["teamId"])
    .index("byCreatedBy", ["createdBy"])
    .index("byNoteDate", ["noteDate"])
});
