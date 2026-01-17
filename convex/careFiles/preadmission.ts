import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query
} from "../_generated/server";

export const submitPreAdmissionForm = mutation({
  args: {
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
    outcome: v.string(),
    plannedAdmissionDate: v.optional(v.number())
  },
  returns: v.id("preAdmissionCareFiles"),
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

    // Create the pre-admission care file
    const preAdmissionId = await ctx.db.insert("preAdmissionCareFiles", {
      ...args,
      createdAt: Date.now(),
      createdBy: user._id
    });

    // Schedule PDF generation after successful save
    await ctx.scheduler.runAfter(
      0,
      internal.careFiles.preadmission.generatePDFAndUpdateRecord,
      {
        formId: preAdmissionId
      }
    );

    return preAdmissionId;
  }
});

/**
 * Get a pre-admission care file by ID
 */
export const getPreAdmissionForm = query({
  args: {
    id: v.id("preAdmissionCareFiles")
  },
  returns: v.union(
    v.object({
      _id: v.id("preAdmissionCareFiles"),
      _creationTime: v.number(),
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
      outcome: v.string(),
      plannedAdmissionDate: v.optional(v.number()),
      // Utils
      createdAt: v.number(),
      createdBy: v.id("users")
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const preAdmissionForm = await ctx.db.get(args.id);
    return preAdmissionForm;
  }
});

/**
 * Get pre-admission forms for a specific resident
 */
export const getPreAdmissionFormsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("preAdmissionCareFiles"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.boolean(),
      careHomeName: v.string(),
      userName: v.string(),
      jobRole: v.string(),
      date: v.number(),
      firstName: v.string(),
      lastName: v.string(),
      createdAt: v.number(),
      createdBy: v.id("users"),
      pdfFileId: v.optional(v.id("_storage"))
    })
  ),
  handler: async (ctx, args) => {
    const forms = await ctx.db
      .query("preAdmissionCareFiles")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return forms.map((form) => ({
      _id: form._id,
      _creationTime: form._creationTime,
      residentId: form.residentId,
      teamId: form.teamId,
      organizationId: form.organizationId,
      savedAsDraft: form.savedAsDraft,
      careHomeName: form.careHomeName,
      userName: form.userName,
      jobRole: form.jobRole,
      date: form.date,
      firstName: form.firstName,
      lastName: form.lastName,
      createdAt: form.createdAt,
      createdBy: form.createdBy,
      pdfFileId: form.pdfFileId
    }));
  }
});

/**
 * Update an existing pre-admission form (for drafts)
 */
export const updatePreAdmissionForm = mutation({
  args: {
    id: v.id("preAdmissionCareFiles"),
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
    outcome: v.string(),
    plannedAdmissionDate: v.optional(v.number()),
    userId: v.string()
  },
  returns: v.id("preAdmissionCareFiles"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify the form exists
    const existingForm = await ctx.db.get(args.id);
    if (!existingForm) {
      throw new Error("Pre-admission form not found");
    }

    // Create a NEW version instead of patching the old one
    const newFormId = await ctx.db.insert("preAdmissionCareFiles", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      savedAsDraft: args.savedAsDraft,
      consentAcceptedAt: args.consentAcceptedAt,
      careHomeName: args.careHomeName,
      nhsHealthCareNumber: args.nhsHealthCareNumber,
      userName: args.userName,
      jobRole: args.jobRole,
      date: args.date,
      firstName: args.firstName,
      lastName: args.lastName,
      address: args.address,
      phoneNumber: args.phoneNumber,
      ethnicity: args.ethnicity,
      gender: args.gender,
      religion: args.religion,
      dateOfBirth: args.dateOfBirth,
      kinFirstName: args.kinFirstName,
      kinLastName: args.kinLastName,
      kinRelationship: args.kinRelationship,
      kinPhoneNumber: args.kinPhoneNumber,
      careManagerName: args.careManagerName,
      careManagerPhoneNumber: args.careManagerPhoneNumber,
      districtNurseName: args.districtNurseName,
      districtNursePhoneNumber: args.districtNursePhoneNumber,
      generalPractitionerName: args.generalPractitionerName,
      generalPractitionerPhoneNumber: args.generalPractitionerPhoneNumber,
      providerHealthcareInfoName: args.providerHealthcareInfoName,
      providerHealthcareInfoDesignation: args.providerHealthcareInfoDesignation,
      allergies: args.allergies,
      medicalHistory: args.medicalHistory,
      medicationPrescribed: args.medicationPrescribed,
      consentCapacityRights: args.consentCapacityRights,
      medication: args.medication,
      mobility: args.mobility,
      nutrition: args.nutrition,
      continence: args.continence,
      hygieneDressing: args.hygieneDressing,
      skin: args.skin,
      cognition: args.cognition,
      infection: args.infection,
      breathing: args.breathing,
      alteredStateOfConsciousness: args.alteredStateOfConsciousness,
      dnacpr: args.dnacpr,
      advancedDecision: args.advancedDecision,
      capacity: args.capacity,
      advancedCarePlan: args.advancedCarePlan,
      comments: args.comments,
      roomPreferences: args.roomPreferences,
      admissionContact: args.admissionContact,
      foodPreferences: args.foodPreferences,
      preferedName: args.preferedName,
      familyConcerns: args.familyConcerns,
      otherHealthCareProfessional: args.otherHealthCareProfessional,
      equipment: args.equipment,
      attendFinances: args.attendFinances,
      additionalConsiderations: args.additionalConsiderations,
      outcome: args.outcome,
      plannedAdmissionDate: args.plannedAdmissionDate,
      createdAt: now,
      createdBy: existingForm.createdBy
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.preadmission.generatePDFAndUpdateRecord,
        {
          formId: newFormId
        }
      );
    }

    return newFormId;
  }
});

/**
 * Check if a pre-admission form exists for a resident
 */
export const hasPreAdmissionForm = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("preAdmissionCareFiles")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .first();

    return form !== null;
  }
});

/**
 * Delete a pre-admission form
 */
export const deletePreAdmissionForm = mutation({
  args: {
    id: v.id("preAdmissionCareFiles")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the form exists
    const existingForm = await ctx.db.get(args.id);
    if (!existingForm) {
      throw new Error("Pre-admission form not found");
    }

    // Delete the form
    await ctx.db.delete(args.id);
    return null;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    formId: v.id("preAdmissionCareFiles")
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/pre-admission`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/pre-admission`, {
        method: "POST",
        headers,
        body: JSON.stringify({ formId: args.formId })
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

      // Update the form record with the PDF file ID
      await ctx.runMutation(internal.careFiles.preadmission.updatePDFFileId, {
        formId: args.formId,
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
 * Update a pre-admission form with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    formId: v.id("preAdmissionCareFiles"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.formId, {
      pdfFileId: args.pdfFileId
    });
    return null;
  }
});

/**
 * Get PDF URL for a pre-admission form
 */
export const getPDFUrl = query({
  args: {
    formId: v.id("preAdmissionCareFiles")
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);

    if (!form || !form.pdfFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(form.pdfFileId);
    return url;
  }
});

/**
 * Get archived (non-latest) pre-admission forms for a resident
 * Returns all forms except the most recent one
 */
export const getArchivedForResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all forms for this resident, ordered by creation time (newest first)
    const allForms = await ctx.db
      .query("preAdmissionCareFiles")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    // Return all except the first one (the latest)
    return allForms.length > 1 ? allForms.slice(1) : [];
  }
});
