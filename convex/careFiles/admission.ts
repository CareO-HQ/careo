import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitAdmissionAssessment = mutation({
  args: {
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
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("admissionAssesments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Verify user has access to this resident's organization
    if (resident.organizationId !== args.organizationId) {
      throw new Error("Unauthorized access to resident");
    }

    // Insert the admission assessment
    const assessmentId = await ctx.db.insert("admissionAssesments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      bedroomNumber: args.bedroomNumber,
      admittedFrom: args.admittedFrom,
      religion: args.religion,
      telephoneNumber: args.telephoneNumber,
      gender: args.gender,
      NHSNumber: args.NHSNumber,
      ethnicity: args.ethnicity,

      // Next of kin
      kinFirstName: args.kinFirstName,
      kinLastName: args.kinLastName,
      kinRelationship: args.kinRelationship,
      kinTelephoneNumber: args.kinTelephoneNumber,
      kinAddress: args.kinAddress,
      kinEmail: args.kinEmail,

      // Emergency contacts
      emergencyContactName: args.emergencyContactName,
      emergencyContactTelephoneNumber: args.emergencyContactTelephoneNumber,
      emergencyContactRelationship: args.emergencyContactRelationship,
      emergencyContactPhoneNumber: args.emergencyContactPhoneNumber,

      // Care manager
      careManagerName: args.careManagerName,
      careManagerTelephoneNumber: args.careManagerTelephoneNumber,
      careManagerRelationship: args.careManagerRelationship,
      careManagerPhoneNumber: args.careManagerPhoneNumber,
      careManagerAddress: args.careManagerAddress,
      careManagerJobRole: args.careManagerJobRole,

      // GP
      GPName: args.GPName,
      GPAddress: args.GPAddress,
      GPPhoneNumber: args.GPPhoneNumber,

      // Medical information
      allergies: args.allergies,
      medicalHistory: args.medicalHistory,
      prescribedMedications: args.prescribedMedications,
      consentCapacityRights: args.consentCapacityRights,
      medication: args.medication,

      // Care assessments
      skinIntegrityEquipment: args.skinIntegrityEquipment,
      skinIntegrityWounds: args.skinIntegrityWounds,
      bedtimeRoutine: args.bedtimeRoutine,
      currentInfection: args.currentInfection,
      antibioticsPrescribed: args.antibioticsPrescribed,
      prescribedBreathing: args.prescribedBreathing,

      // Mobility
      mobilityIndependent: args.mobilityIndependent,
      assistanceRequired: args.assistanceRequired,
      equipmentRequired: args.equipmentRequired,

      // Nutrition
      weight: args.weight,
      height: args.height,
      iddsiFood: args.iddsiFood,
      iddsiFluid: args.iddsiFluid,
      dietType: args.dietType,
      nutritionalSupplements: args.nutritionalSupplements,
      nutritionalAssistanceRequired: args.nutritionalAssistanceRequired,
      chockingRisk: args.chockingRisk,
      additionalComments: args.additionalComments,

      // Personal care
      continence: args.continence,
      hygiene: args.hygiene,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.admission.generatePDFAndUpdateRecord,
        { assessmentId }
      );
    }

    return assessmentId;
  }
});

export const getAdmissionAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("admissionAssesments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.number(),
      bedroomNumber: v.string(),
      NHSNumber: v.string(),
      status: v.union(
        v.literal("draft"),
        v.literal("submitted"),
        v.literal("reviewed")
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string()
    })
  ),
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    const assessments = await ctx.db
      .query("admissionAssesments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return simplified data for listing
    return assessments.map((assessment) => ({
      _id: assessment._id,
      _creationTime: assessment._creationTime,
      residentId: assessment.residentId,
      teamId: assessment.teamId,
      organizationId: assessment.organizationId,
      userId: assessment.userId,
      firstName: assessment.firstName,
      lastName: assessment.lastName,
      dateOfBirth: assessment.dateOfBirth,
      bedroomNumber: assessment.bedroomNumber,
      NHSNumber: assessment.NHSNumber,
      status: assessment.status ?? "submitted",
      submittedAt: assessment.submittedAt,
      createdBy: assessment.createdBy
    }));
  }
});

export const getAdmissionAssessmentById = query({
  args: {
    assessmentId: v.id("admissionAssesments")
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("admissionAssesments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),

      // All the admission assessment fields
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

      // Medical information
      allergies: v.optional(v.string()),
      medicalHistory: v.optional(v.string()),
      prescribedMedications: v.optional(v.string()),
      consentCapacityRights: v.optional(v.string()),
      medication: v.optional(v.string()),

      // Care assessments
      skinIntegrityEquipment: v.optional(v.string()),
      skinIntegrityWounds: v.optional(v.string()),
      bedtimeRoutine: v.optional(v.string()),
      currentInfection: v.optional(v.string()),
      antibioticsPrescribed: v.boolean(),
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

      // Personal care
      continence: v.optional(v.string()),
      hygiene: v.optional(v.string()),

      // Metadata
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      pdfUrl: v.optional(v.string())
    })
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      return null;
    }

    // Verify assessment has an associated resident
    const resident = await ctx.db.get(assessment.residentId);
    if (!resident) {
      throw new Error("Associated resident not found");
    }

    return assessment;
  }
});

export const updateAdmissionAssessment = mutation({
  args: {
    assessmentId: v.id("admissionAssesments"),

    // All the same fields as submitAdmissionAssessment
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

    // Medical information
    allergies: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    prescribedMedications: v.optional(v.string()),
    consentCapacityRights: v.optional(v.string()),
    medication: v.optional(v.string()),

    // Care assessments
    skinIntegrityEquipment: v.optional(v.string()),
    skinIntegrityWounds: v.optional(v.string()),
    bedtimeRoutine: v.optional(v.string()),
    currentInfection: v.optional(v.string()),
    antibioticsPrescribed: v.boolean(),
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

    // Personal care
    continence: v.optional(v.string()),
    hygiene: v.optional(v.string()),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("admissionAssesments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify assessment exists
    const existingAssessment = await ctx.db.get(args.assessmentId);
    if (!existingAssessment) {
      throw new Error("Assessment not found");
    }

    // Create a NEW version instead of patching the old one
    const newAssessmentId = await ctx.db.insert("admissionAssesments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Resident information
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      bedroomNumber: args.bedroomNumber,
      admittedFrom: args.admittedFrom,
      religion: args.religion,
      telephoneNumber: args.telephoneNumber,
      gender: args.gender,
      NHSNumber: args.NHSNumber,
      ethnicity: args.ethnicity,

      // Next of kin
      kinFirstName: args.kinFirstName,
      kinLastName: args.kinLastName,
      kinRelationship: args.kinRelationship,
      kinTelephoneNumber: args.kinTelephoneNumber,
      kinAddress: args.kinAddress,
      kinEmail: args.kinEmail,

      // Emergency contacts
      emergencyContactName: args.emergencyContactName,
      emergencyContactTelephoneNumber: args.emergencyContactTelephoneNumber,
      emergencyContactRelationship: args.emergencyContactRelationship,
      emergencyContactPhoneNumber: args.emergencyContactPhoneNumber,

      // Care manager
      careManagerName: args.careManagerName,
      careManagerTelephoneNumber: args.careManagerTelephoneNumber,
      careManagerRelationship: args.careManagerRelationship,
      careManagerPhoneNumber: args.careManagerPhoneNumber,
      careManagerAddress: args.careManagerAddress,
      careManagerJobRole: args.careManagerJobRole,

      // GP
      GPName: args.GPName,
      GPAddress: args.GPAddress,
      GPPhoneNumber: args.GPPhoneNumber,

      // Medical information
      allergies: args.allergies,
      medicalHistory: args.medicalHistory,
      prescribedMedications: args.prescribedMedications,
      consentCapacityRights: args.consentCapacityRights,
      medication: args.medication,

      // Care assessments
      skinIntegrityEquipment: args.skinIntegrityEquipment,
      skinIntegrityWounds: args.skinIntegrityWounds,
      bedtimeRoutine: args.bedtimeRoutine,
      currentInfection: args.currentInfection,
      antibioticsPrescribed: args.antibioticsPrescribed,
      prescribedBreathing: args.prescribedBreathing,

      // Mobility
      mobilityIndependent: args.mobilityIndependent,
      assistanceRequired: args.assistanceRequired,
      equipmentRequired: args.equipmentRequired,

      // Nutrition
      weight: args.weight,
      height: args.height,
      iddsiFood: args.iddsiFood,
      iddsiFluid: args.iddsiFluid,
      dietType: args.dietType,
      nutritionalSupplements: args.nutritionalSupplements,
      nutritionalAssistanceRequired: args.nutritionalAssistanceRequired,
      chockingRisk: args.chockingRisk,
      additionalComments: args.additionalComments,

      // Personal care
      continence: args.continence,
      hygiene: args.hygiene,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF regeneration if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.admission.generatePDFAndUpdateRecord,
        { assessmentId: newAssessmentId }
      );
    }

    return newAssessmentId;
  }
});

export const saveDraftAdmissionAssessment = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    draftData: v.any() // Flexible for partial data
  },
  returns: v.id("admissionAssesments"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing draft
    const existingDraft = await ctx.db
      .query("admissionAssesments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();

    if (existingDraft) {
      // Update existing draft
      await ctx.db.patch(existingDraft._id, {
        ...args.draftData,
        lastModifiedAt: now,
        lastModifiedBy: args.userId
      });
      return existingDraft._id;
    } else {
      // Create new draft with minimal required fields
      const draftId = await ctx.db.insert("admissionAssesments", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,

        // Default values for required fields
        firstName: args.draftData.firstName ?? "",
        lastName: args.draftData.lastName ?? "",
        dateOfBirth: args.draftData.dateOfBirth ?? Date.now(),
        bedroomNumber: args.draftData.bedroomNumber ?? "",
        NHSNumber: args.draftData.NHSNumber ?? "",
        kinFirstName: args.draftData.kinFirstName ?? "",
        kinLastName: args.draftData.kinLastName ?? "",
        kinRelationship: args.draftData.kinRelationship ?? "",
        kinTelephoneNumber: args.draftData.kinTelephoneNumber ?? "",
        kinAddress: args.draftData.kinAddress ?? "",
        kinEmail: args.draftData.kinEmail ?? "",
        emergencyContactName: args.draftData.emergencyContactName ?? "",
        emergencyContactTelephoneNumber:
          args.draftData.emergencyContactTelephoneNumber ?? "",
        emergencyContactRelationship:
          args.draftData.emergencyContactRelationship ?? "",
        emergencyContactPhoneNumber:
          args.draftData.emergencyContactPhoneNumber ?? "",
        antibioticsPrescribed: args.draftData.antibioticsPrescribed ?? false,
        mobilityIndependent: args.draftData.mobilityIndependent ?? false,
        weight: args.draftData.weight ?? "",
        height: args.draftData.height ?? "",
        iddsiFood: args.draftData.iddsiFood ?? "",
        iddsiFluid: args.draftData.iddsiFluid ?? "",
        dietType: args.draftData.dietType ?? "",
        chockingRisk: args.draftData.chockingRisk ?? false,

        // Include any other provided data
        ...args.draftData,

        status: "draft" as const,
        createdBy: args.userId
      });
      return draftId;
    }
  }
});

export const deleteAdmissionAssessment = mutation({
  args: {
    assessmentId: v.id("admissionAssesments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify assessment exists
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    // Delete the assessment
    await ctx.db.delete(args.assessmentId);

    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("admissionAssesments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the assessment data
      const assessment = await ctx.runQuery(
        internal.careFiles.admission.getAdmissionAssessmentForPDF,
        { assessmentId: args.assessmentId }
      );

      if (!assessment) {
        throw new Error("Assessment not found");
      }

      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl?.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return null;
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      // Add authentication header if token is available
      if (pdfApiToken) {
        headers["Authorization"] = `Bearer ${pdfApiToken}`;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/admission`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/admission`, {
        method: "POST",
        headers,
        body: JSON.stringify(assessment)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/admission`,
        hasToken: !!pdfApiToken,
        assessmentId: args.assessmentId
      });

      console.log(
        "PDF API response status:",
        pdfResponse.status,
        pdfResponse.statusText
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.log("PDF API error response:", errorText);
        throw new Error(
          `PDF generation failed: ${pdfResponse.status} ${pdfResponse.statusText} - ${errorText}`
        );
      }

      // Get the PDF as a buffer
      const pdfBuffer = await pdfResponse.arrayBuffer();

      // Convert to Blob for Convex storage
      const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(pdfBlob);

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.admission.updatePDFFileId, {
        assessmentId: args.assessmentId,
        pdfFileId: storageId
      });
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

/**
 * Get admission assessment data for PDF generation (internal use only)
 */
export const getAdmissionAssessmentForPDF = internalQuery({
  args: {
    assessmentId: v.id("admissionAssesments")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment;
  }
});

/**
 * Update an admission assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("admissionAssesments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

export const updateAssessmentWithPDF = internalMutation({
  args: {
    assessmentId: v.id("admissionAssesments"),
    pdfUrl: v.string(),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfUrl: args.pdfUrl,
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });

    return null;
  }
});

/**
 * Get PDF URL for an admission assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("admissionAssesments")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment || !assessment.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(assessment.pdfFileId);
    return url;
  }
});

/**
 * Get archived (non-latest) admission assessments for a resident
 * Returns all assessments except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all assessments for this resident, ordered by creation time (newest first)
    const allAssessments = await ctx.db
      .query("admissionAssesments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allAssessments.length > 1 ? allAssessments.slice(1) : [];
  }
});
