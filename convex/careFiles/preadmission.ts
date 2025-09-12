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
 * Submit a pre-admission care file form
 */
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
    updates: v.object({
      savedAsDraft: v.optional(v.boolean()),
      // Header information
      consentAcceptedAt: v.optional(v.number()),
      careHomeName: v.optional(v.string()),
      nhsHealthCareNumber: v.optional(v.string()),
      userName: v.optional(v.string()),
      jobRole: v.optional(v.string()),
      date: v.optional(v.number()),
      // Resident information
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      address: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
      religion: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      // Next of kin
      kinFirstName: v.optional(v.string()),
      kinLastName: v.optional(v.string()),
      kinRelationship: v.optional(v.string()),
      kinPhoneNumber: v.optional(v.string()),
      // Professional contacts
      careManagerName: v.optional(v.string()),
      careManagerPhoneNumber: v.optional(v.string()),
      districtNurseName: v.optional(v.string()),
      districtNursePhoneNumber: v.optional(v.string()),
      generalPractitionerName: v.optional(v.string()),
      generalPractitionerPhoneNumber: v.optional(v.string()),
      providerHealthcareInfoName: v.optional(v.string()),
      providerHealthcareInfoDesignation: v.optional(v.string()),
      // Medical information
      allergies: v.optional(v.string()),
      medicalHistory: v.optional(v.string()),
      medicationPrescribed: v.optional(v.string()),
      // Assessment
      consentCapacityRights: v.optional(v.string()),
      medication: v.optional(v.string()),
      mobility: v.optional(v.string()),
      nutrition: v.optional(v.string()),
      continence: v.optional(v.string()),
      hygieneDressing: v.optional(v.string()),
      skin: v.optional(v.string()),
      cognition: v.optional(v.string()),
      infection: v.optional(v.string()),
      breathing: v.optional(v.string()),
      alteredStateOfConsciousness: v.optional(v.string()),
      // Palliative and End of life care
      dnacpr: v.optional(v.boolean()),
      advancedDecision: v.optional(v.boolean()),
      capacity: v.optional(v.boolean()),
      advancedCarePlan: v.optional(v.boolean()),
      comments: v.optional(v.string()),
      // Preferences
      roomPreferences: v.optional(v.string()),
      admissionContact: v.optional(v.string()),
      foodPreferences: v.optional(v.string()),
      preferedName: v.optional(v.string()),
      familyConcerns: v.optional(v.string()),
      // Other information
      otherHealthCareProfessional: v.optional(v.string()),
      equipment: v.optional(v.string()),
      // Financial
      attendFinances: v.optional(v.boolean()),
      // Additional considerations
      additionalConsiderations: v.optional(v.string()),
      // Outcome
      outcome: v.optional(v.string()),
      plannedAdmissionDate: v.optional(v.number())
    })
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the form exists
    const existingForm = await ctx.db.get(args.id);
    if (!existingForm) {
      throw new Error("Pre-admission form not found");
    }

    // Update the form
    await ctx.db.patch(args.id, args.updates);
    return null;
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
