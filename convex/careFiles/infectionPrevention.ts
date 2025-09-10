import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Submit an infection prevention assessment form
 */
export const submitInfectionPreventionAssessment = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    savedAsDraft: v.optional(v.boolean()),

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
    completionDate: v.string()
  },
  returns: v.id("infectionPreventionAssessments"),
  handler: async (ctx, args) => {
    // Verify the resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Get the current user ID from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create the infection prevention assessment
    const assessmentId = await ctx.db.insert("infectionPreventionAssessments", {
      ...args,
      createdAt: Date.now(),
      createdBy: user._id,
      savedAsDraft: args.savedAsDraft ?? false
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.infectionPrevention.generatePDFAndUpdateRecord,
        {
          assessmentId: assessmentId
        }
      );
    }

    return assessmentId;
  }
});

/**
 * Get an infection prevention assessment by ID
 */
export const getInfectionPreventionAssessment = query({
  args: {
    id: v.id("infectionPreventionAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("infectionPreventionAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.optional(v.boolean()),

      // Person's details
      name: v.string(),
      dateOfBirth: v.string(),
      homeAddress: v.string(),
      assessmentType: v.union(
        v.literal("Pre-admission"),
        v.literal("Admission")
      ),
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
      pdfFileId: v.optional(v.id("_storage"))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.id);
    return assessment;
  }
});

/**
 * Get infection prevention assessments for a specific resident
 */
export const getInfectionPreventionAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("infectionPreventionAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.optional(v.boolean()),
      name: v.string(),
      assessmentType: v.union(
        v.literal("Pre-admission"),
        v.literal("Admission")
      ),
      completedBy: v.string(),
      jobRole: v.string(),
      completionDate: v.string(),
      createdAt: v.number(),
      createdBy: v.id("users"),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("infectionPreventionAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return assessments.map((assessment) => ({
      _id: assessment._id,
      _creationTime: assessment._creationTime,
      residentId: assessment.residentId,
      teamId: assessment.teamId,
      organizationId: assessment.organizationId,
      savedAsDraft: assessment.savedAsDraft,
      name: assessment.name,
      assessmentType: assessment.assessmentType,
      completedBy: assessment.completedBy,
      jobRole: assessment.jobRole,
      completionDate: assessment.completionDate,
      createdAt: assessment.createdAt,
      createdBy: assessment.createdBy,
      pdfFileId: assessment.pdfFileId
    }));
  }
});

/**
 * Update an existing infection prevention assessment (for drafts)
 */
export const updateInfectionPreventionAssessment = mutation({
  args: {
    id: v.id("infectionPreventionAssessments"),
    updates: v.object({
      savedAsDraft: v.optional(v.boolean()),

      // Person's details
      name: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      homeAddress: v.optional(v.string()),
      assessmentType: v.optional(
        v.union(v.literal("Pre-admission"), v.literal("Admission"))
      ),
      informationProvidedBy: v.optional(v.string()),
      admittedFrom: v.optional(v.string()),
      consultantGP: v.optional(v.string()),
      reasonForAdmission: v.optional(v.string()),
      dateOfAdmission: v.optional(v.string()),

      // Acute Respiratory Illness (ARI)
      newContinuousCough: v.optional(v.boolean()),
      worseningCough: v.optional(v.boolean()),
      temperatureHigh: v.optional(v.boolean()),
      otherRespiratorySymptoms: v.optional(v.string()),
      testedForCovid19: v.optional(v.boolean()),
      testedForInfluenzaA: v.optional(v.boolean()),
      testedForInfluenzaB: v.optional(v.boolean()),
      testedForRespiratoryScreen: v.optional(v.boolean()),
      influenzaB: v.boolean(),
      respiratoryScreen: v.boolean(),

      // Exposure
      exposureToPatientsCovid: v.optional(v.boolean()),
      exposureToStaffCovid: v.optional(v.boolean()),
      isolationRequired: v.optional(v.boolean()),
      isolationDetails: v.optional(v.string()),
      furtherTreatmentRequired: v.optional(v.boolean()),

      // Infective Diarrhoea / Vomiting
      diarrheaVomitingCurrentSymptoms: v.optional(v.boolean()),
      diarrheaVomitingContactWithOthers: v.optional(v.boolean()),
      diarrheaVomitingFamilyHistory72h: v.optional(v.boolean()),

      // Clostridium Difficile
      clostridiumActive: v.optional(v.boolean()),
      clostridiumHistory: v.optional(v.boolean()),
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
      mrsaMssaColonised: v.optional(v.boolean()),
      mrsaMssaInfected: v.optional(v.boolean()),
      mrsaMssaLastPositiveSwabDate: v.optional(v.string()),
      mrsaMssaSitesPositive: v.optional(v.string()),
      mrsaMssaTreatmentReceived: v.optional(v.string()),
      mrsaMssaTreatmentComplete: v.optional(v.string()),
      mrsaMssaDetails: v.optional(v.string()),
      mrsaMssaDateCommenced: v.optional(v.string()),
      mrsaMssaLengthOfCourse: v.optional(v.string()),
      mrsaMssaFollowUpRequired: v.optional(v.string()),

      // Multi-drug resistant organisms
      esbl: v.optional(v.boolean()),
      vreGre: v.optional(v.boolean()),
      cpe: v.optional(v.boolean()),
      otherMultiDrugResistance: v.optional(v.string()),
      relevantInformationMultiDrugResistance: v.optional(v.string()),

      // Other Information
      awarenessOfInfection: v.optional(v.boolean()),
      lastFluVaccinationDate: v.optional(v.string()),

      // Assessment Completion
      completedBy: v.optional(v.string()),
      jobRole: v.optional(v.string()),
      signature: v.optional(v.string()),
      completionDate: v.optional(v.string())
    })
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the assessment exists
    const existingAssessment = await ctx.db.get(args.id);
    if (!existingAssessment) {
      throw new Error("Infection prevention assessment not found");
    }

    // Get the current user ID from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Update the assessment
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: user._id
    });

    // Schedule PDF generation if the draft is being finalized
    if (
      args.updates.savedAsDraft === false &&
      existingAssessment.savedAsDraft
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.infectionPrevention.generatePDFAndUpdateRecord,
        {
          assessmentId: args.id
        }
      );
    }

    return null;
  }
});

/**
 * Check if an infection prevention assessment exists for a resident
 */
export const hasInfectionPreventionAssessment = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const assessment = await ctx.db
      .query("infectionPreventionAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .first();

    return assessment !== null;
  }
});

/**
 * Delete an infection prevention assessment
 */
export const deleteInfectionPreventionAssessment = mutation({
  args: {
    id: v.id("infectionPreventionAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the assessment exists
    const existingAssessment = await ctx.db.get(args.id);
    if (!existingAssessment) {
      throw new Error("Infection prevention assessment not found");
    }

    // Delete the assessment
    await ctx.db.delete(args.id);
    return null;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("infectionPreventionAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
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
      console.log(
        "Calling PDF API at:",
        `${pdfApiUrl}/api/pdf/infection-prevention`
      );
      const pdfResponse = await fetch(
        `${pdfApiUrl}/api/pdf/infection-prevention`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ assessmentId: args.assessmentId })
        }
      );

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
      await ctx.runMutation(
        internal.careFiles.infectionPrevention.updatePDFFileId,
        {
          assessmentId: args.assessmentId,
          pdfFileId: storageId
        }
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
      // Don't throw here to avoid crashing the entire form submission
    }

    return null;
  }
});

/**
 * Update an infection prevention assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("infectionPreventionAssessments"),
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

/**
 * Get PDF URL for an infection prevention assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("infectionPreventionAssessments")
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
