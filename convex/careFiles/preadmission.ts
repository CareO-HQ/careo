import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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
      createdBy: v.id("users")
    })
  ),
  handler: async (ctx, args) => {
    const forms = await ctx.db
      .query("preAdmissionCareFiles")
      .filter((q) => q.eq(q.field("residentId"), args.residentId))
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
      createdBy: form.createdBy
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
