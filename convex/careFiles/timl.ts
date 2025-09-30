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

export const submitTimlAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // Agreement
    agree: v.boolean(),

    // Resident details
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

    // Current preferences
    whatEnjoyNow: v.string(),
    whatLikeRead: v.string(),

    // Completion
    completedBy: v.string(),
    completedByJobRole: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.id("timlAssessments"),
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

    // Insert the TIML assessment
    const assessmentId = await ctx.db.insert("timlAssessments", {
      residentId: args.residentId,
      teamId: args.teamId,
      organizationId: args.organizationId,
      userId: args.userId,

      // Agreement
      agree: args.agree,

      // Resident details
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      desiredName: args.desiredName,

      // Childhood
      born: args.born,
      parentsSiblingsNames: args.parentsSiblingsNames,
      familyMembersOccupation: args.familyMembersOccupation,
      whereLived: args.whereLived,
      schoolAttended: args.schoolAttended,
      favouriteSubject: args.favouriteSubject,
      pets: args.pets,
      petsNames: args.petsNames,

      // Adolescence
      whenLeavingSchool: args.whenLeavingSchool,
      whatWork: args.whatWork,
      whereWorked: args.whereWorked,
      specialTraining: args.specialTraining,
      specialMemoriesWork: args.specialMemoriesWork,
      nationalService: args.nationalService,

      // Adulthood
      partner: args.partner,
      partnerName: args.partnerName,
      whereMet: args.whereMet,
      whereWhenMarried: args.whereWhenMarried,
      whatDidYouWear: args.whatDidYouWear,
      flowers: args.flowers,
      honeyMoon: args.honeyMoon,
      whereLivedAdult: args.whereLivedAdult,
      childrenAndNames: args.childrenAndNames,
      grandchildrenAndNames: args.grandchildrenAndNames,
      specialFriendsAndNames: args.specialFriendsAndNames,
      specialFriendsMetAndStillTouch: args.specialFriendsMetAndStillTouch,

      // Retirement
      whenRetired: args.whenRetired,
      lookingForwardTo: args.lookingForwardTo,
      hobbiesInterests: args.hobbiesInterests,
      biggestChangesRetirement: args.biggestChangesRetirement,

      // Current preferences
      whatEnjoyNow: args.whatEnjoyNow,
      whatLikeRead: args.whatLikeRead,

      // Completion
      completedBy: args.completedBy,
      completedByJobRole: args.completedByJobRole,
      completedBySignature: args.completedBySignature,
      date: args.date,

      // Metadata
      status: args.savedAsDraft ? ("draft" as const) : ("submitted" as const),
      submittedAt: args.savedAsDraft ? undefined : now,
      createdBy: args.userId
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.timl.generatePDFAndUpdateRecord,
        { assessmentId }
      );
    }

    return assessmentId;
  }
});

export const getTimlAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("timlAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      agree: v.boolean(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.number(),
      desiredName: v.string(),
      born: v.string(),
      parentsSiblingsNames: v.string(),
      familyMembersOccupation: v.string(),
      whereLived: v.string(),
      schoolAttended: v.string(),
      favouriteSubject: v.string(),
      pets: v.boolean(),
      petsNames: v.optional(v.string()),
      whenLeavingSchool: v.string(),
      whatWork: v.string(),
      whereWorked: v.string(),
      specialTraining: v.string(),
      specialMemoriesWork: v.string(),
      nationalService: v.string(),
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
      whenRetired: v.string(),
      lookingForwardTo: v.string(),
      hobbiesInterests: v.string(),
      biggestChangesRetirement: v.string(),
      whatEnjoyNow: v.string(),
      whatLikeRead: v.string(),
      completedBy: v.string(),
      completedByJobRole: v.string(),
      completedBySignature: v.string(),
      date: v.number(),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfGeneratedAt: v.optional(v.number())
    })
  ),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("timlAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const getTimlAssessmentById = query({
  args: {
    assessmentId: v.id("timlAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("timlAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      agree: v.boolean(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.number(),
      desiredName: v.string(),
      born: v.string(),
      parentsSiblingsNames: v.string(),
      familyMembersOccupation: v.string(),
      whereLived: v.string(),
      schoolAttended: v.string(),
      favouriteSubject: v.string(),
      pets: v.boolean(),
      petsNames: v.optional(v.string()),
      whenLeavingSchool: v.string(),
      whatWork: v.string(),
      whereWorked: v.string(),
      specialTraining: v.string(),
      specialMemoriesWork: v.string(),
      nationalService: v.string(),
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
      whenRetired: v.string(),
      lookingForwardTo: v.string(),
      hobbiesInterests: v.string(),
      biggestChangesRetirement: v.string(),
      whatEnjoyNow: v.string(),
      whatLikeRead: v.string(),
      completedBy: v.string(),
      completedByJobRole: v.string(),
      completedBySignature: v.string(),
      date: v.number(),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("reviewed")
        )
      ),
      submittedAt: v.optional(v.number()),
      createdBy: v.string(),
      lastModifiedAt: v.optional(v.number()),
      lastModifiedBy: v.optional(v.string()),
      pdfUrl: v.optional(v.string()),
      pdfFileId: v.optional(v.id("_storage")),
      pdfGeneratedAt: v.optional(v.number())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment;
  }
});

export const updateTimlAssessment = mutation({
  args: {
    assessmentId: v.id("timlAssessments"),

    // Agreement
    agree: v.boolean(),

    // Resident details
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

    // Current preferences
    whatEnjoyNow: v.string(),
    whatLikeRead: v.string(),

    // Completion
    completedBy: v.string(),
    completedByJobRole: v.string(),
    completedBySignature: v.string(),
    date: v.number(),

    // Metadata
    savedAsDraft: v.optional(v.boolean())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get existing assessment
    const existingAssessment = await ctx.db.get(args.assessmentId);
    if (!existingAssessment) {
      throw new Error("Assessment not found");
    }

    // Update the assessment
    await ctx.db.patch(args.assessmentId, {
      agree: args.agree,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      desiredName: args.desiredName,
      born: args.born,
      parentsSiblingsNames: args.parentsSiblingsNames,
      familyMembersOccupation: args.familyMembersOccupation,
      whereLived: args.whereLived,
      schoolAttended: args.schoolAttended,
      favouriteSubject: args.favouriteSubject,
      pets: args.pets,
      petsNames: args.petsNames,
      whenLeavingSchool: args.whenLeavingSchool,
      whatWork: args.whatWork,
      whereWorked: args.whereWorked,
      specialTraining: args.specialTraining,
      specialMemoriesWork: args.specialMemoriesWork,
      nationalService: args.nationalService,
      partner: args.partner,
      partnerName: args.partnerName,
      whereMet: args.whereMet,
      whereWhenMarried: args.whereWhenMarried,
      whatDidYouWear: args.whatDidYouWear,
      flowers: args.flowers,
      honeyMoon: args.honeyMoon,
      whereLivedAdult: args.whereLivedAdult,
      childrenAndNames: args.childrenAndNames,
      grandchildrenAndNames: args.grandchildrenAndNames,
      specialFriendsAndNames: args.specialFriendsAndNames,
      specialFriendsMetAndStillTouch: args.specialFriendsMetAndStillTouch,
      whenRetired: args.whenRetired,
      lookingForwardTo: args.lookingForwardTo,
      hobbiesInterests: args.hobbiesInterests,
      biggestChangesRetirement: args.biggestChangesRetirement,
      whatEnjoyNow: args.whatEnjoyNow,
      whatLikeRead: args.whatLikeRead,
      completedBy: args.completedBy,
      completedByJobRole: args.completedByJobRole,
      completedBySignature: args.completedBySignature,
      date: args.date
    });

    // Schedule PDF generation if not saving as draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        1000, // 1 second delay
        internal.careFiles.timl.generatePDFAndUpdateRecord,
        { assessmentId: args.assessmentId }
      );
    }

    return null;
  }
});

export const saveDraftTimlAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),

    // All fields as optional for draft
    agree: v.optional(v.boolean()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.number()),
    desiredName: v.optional(v.string()),
    born: v.optional(v.string()),
    parentsSiblingsNames: v.optional(v.string()),
    familyMembersOccupation: v.optional(v.string()),
    whereLived: v.optional(v.string()),
    schoolAttended: v.optional(v.string()),
    favouriteSubject: v.optional(v.string()),
    pets: v.optional(v.boolean()),
    petsNames: v.optional(v.string()),
    whenLeavingSchool: v.optional(v.string()),
    whatWork: v.optional(v.string()),
    whereWorked: v.optional(v.string()),
    specialTraining: v.optional(v.string()),
    specialMemoriesWork: v.optional(v.string()),
    nationalService: v.optional(v.string()),
    partner: v.optional(v.string()),
    partnerName: v.optional(v.string()),
    whereMet: v.optional(v.string()),
    whereWhenMarried: v.optional(v.string()),
    whatDidYouWear: v.optional(v.string()),
    flowers: v.optional(v.string()),
    honeyMoon: v.optional(v.string()),
    whereLivedAdult: v.optional(v.string()),
    childrenAndNames: v.optional(v.string()),
    grandchildrenAndNames: v.optional(v.string()),
    specialFriendsAndNames: v.optional(v.string()),
    specialFriendsMetAndStillTouch: v.optional(v.string()),
    whenRetired: v.optional(v.string()),
    lookingForwardTo: v.optional(v.string()),
    hobbiesInterests: v.optional(v.string()),
    biggestChangesRetirement: v.optional(v.string()),
    whatEnjoyNow: v.optional(v.string()),
    whatLikeRead: v.optional(v.string()),
    completedBy: v.optional(v.string()),
    completedByJobRole: v.optional(v.string()),
    completedBySignature: v.optional(v.string()),
    date: v.optional(v.number()),

    // For updates
    assessmentId: v.optional(v.id("timlAssessments"))
  },
  returns: v.id("timlAssessments"),
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

    if (args.assessmentId) {
      // Update existing draft
      const existingAssessment = await ctx.db.get(args.assessmentId);
      if (!existingAssessment) {
        throw new Error("Assessment not found");
      }

      const updateData: any = {};

      // Only update fields that are provided
      if (args.agree !== undefined) updateData.agree = args.agree;
      if (args.firstName !== undefined) updateData.firstName = args.firstName;
      if (args.lastName !== undefined) updateData.lastName = args.lastName;
      if (args.dateOfBirth !== undefined)
        updateData.dateOfBirth = args.dateOfBirth;
      if (args.desiredName !== undefined)
        updateData.desiredName = args.desiredName;
      if (args.born !== undefined) updateData.born = args.born;
      if (args.parentsSiblingsNames !== undefined)
        updateData.parentsSiblingsNames = args.parentsSiblingsNames;
      if (args.familyMembersOccupation !== undefined)
        updateData.familyMembersOccupation = args.familyMembersOccupation;
      if (args.whereLived !== undefined)
        updateData.whereLived = args.whereLived;
      if (args.schoolAttended !== undefined)
        updateData.schoolAttended = args.schoolAttended;
      if (args.favouriteSubject !== undefined)
        updateData.favouriteSubject = args.favouriteSubject;
      if (args.pets !== undefined) updateData.pets = args.pets;
      if (args.petsNames !== undefined) updateData.petsNames = args.petsNames;
      if (args.whenLeavingSchool !== undefined)
        updateData.whenLeavingSchool = args.whenLeavingSchool;
      if (args.whatWork !== undefined) updateData.whatWork = args.whatWork;
      if (args.whereWorked !== undefined)
        updateData.whereWorked = args.whereWorked;
      if (args.specialTraining !== undefined)
        updateData.specialTraining = args.specialTraining;
      if (args.specialMemoriesWork !== undefined)
        updateData.specialMemoriesWork = args.specialMemoriesWork;
      if (args.nationalService !== undefined)
        updateData.nationalService = args.nationalService;
      if (args.partner !== undefined) updateData.partner = args.partner;
      if (args.partnerName !== undefined)
        updateData.partnerName = args.partnerName;
      if (args.whereMet !== undefined) updateData.whereMet = args.whereMet;
      if (args.whereWhenMarried !== undefined)
        updateData.whereWhenMarried = args.whereWhenMarried;
      if (args.whatDidYouWear !== undefined)
        updateData.whatDidYouWear = args.whatDidYouWear;
      if (args.flowers !== undefined) updateData.flowers = args.flowers;
      if (args.honeyMoon !== undefined) updateData.honeyMoon = args.honeyMoon;
      if (args.whereLivedAdult !== undefined)
        updateData.whereLivedAdult = args.whereLivedAdult;
      if (args.childrenAndNames !== undefined)
        updateData.childrenAndNames = args.childrenAndNames;
      if (args.grandchildrenAndNames !== undefined)
        updateData.grandchildrenAndNames = args.grandchildrenAndNames;
      if (args.specialFriendsAndNames !== undefined)
        updateData.specialFriendsAndNames = args.specialFriendsAndNames;
      if (args.specialFriendsMetAndStillTouch !== undefined)
        updateData.specialFriendsMetAndStillTouch =
          args.specialFriendsMetAndStillTouch;
      if (args.whenRetired !== undefined)
        updateData.whenRetired = args.whenRetired;
      if (args.lookingForwardTo !== undefined)
        updateData.lookingForwardTo = args.lookingForwardTo;
      if (args.hobbiesInterests !== undefined)
        updateData.hobbiesInterests = args.hobbiesInterests;
      if (args.biggestChangesRetirement !== undefined)
        updateData.biggestChangesRetirement = args.biggestChangesRetirement;
      if (args.whatEnjoyNow !== undefined)
        updateData.whatEnjoyNow = args.whatEnjoyNow;
      if (args.whatLikeRead !== undefined)
        updateData.whatLikeRead = args.whatLikeRead;
      if (args.completedBy !== undefined)
        updateData.completedBy = args.completedBy;
      if (args.completedByJobRole !== undefined)
        updateData.completedByJobRole = args.completedByJobRole;
      if (args.completedBySignature !== undefined)
        updateData.completedBySignature = args.completedBySignature;
      if (args.date !== undefined) updateData.date = args.date;

      await ctx.db.patch(args.assessmentId, updateData);

      return args.assessmentId;
    } else {
      // Create new draft with defaults
      const assessmentId = await ctx.db.insert("timlAssessments", {
        residentId: args.residentId,
        teamId: args.teamId,
        organizationId: args.organizationId,
        userId: args.userId,
        agree: args.agree || false,
        firstName: args.firstName || "",
        lastName: args.lastName || "",
        dateOfBirth: args.dateOfBirth || now,
        desiredName: args.desiredName || "",
        born: args.born || "",
        parentsSiblingsNames: args.parentsSiblingsNames || "",
        familyMembersOccupation: args.familyMembersOccupation || "",
        whereLived: args.whereLived || "",
        schoolAttended: args.schoolAttended || "",
        favouriteSubject: args.favouriteSubject || "",
        pets: args.pets || false,
        petsNames: args.petsNames,
        whenLeavingSchool: args.whenLeavingSchool || "",
        whatWork: args.whatWork || "",
        whereWorked: args.whereWorked || "",
        specialTraining: args.specialTraining || "",
        specialMemoriesWork: args.specialMemoriesWork || "",
        nationalService: args.nationalService || "",
        partner: args.partner || "",
        partnerName: args.partnerName || "",
        whereMet: args.whereMet || "",
        whereWhenMarried: args.whereWhenMarried || "",
        whatDidYouWear: args.whatDidYouWear || "",
        flowers: args.flowers || "",
        honeyMoon: args.honeyMoon || "",
        whereLivedAdult: args.whereLivedAdult || "",
        childrenAndNames: args.childrenAndNames || "",
        grandchildrenAndNames: args.grandchildrenAndNames || "",
        specialFriendsAndNames: args.specialFriendsAndNames || "",
        specialFriendsMetAndStillTouch:
          args.specialFriendsMetAndStillTouch || "",
        whenRetired: args.whenRetired || "",
        lookingForwardTo: args.lookingForwardTo || "",
        hobbiesInterests: args.hobbiesInterests || "",
        biggestChangesRetirement: args.biggestChangesRetirement || "",
        whatEnjoyNow: args.whatEnjoyNow || "",
        whatLikeRead: args.whatLikeRead || "",
        completedBy: args.completedBy || "",
        completedByJobRole: args.completedByJobRole || "",
        completedBySignature: args.completedBySignature || "",
        date: args.date || now,

        // Metadata
        status: "draft" as const,
        createdBy: args.userId
      });

      return assessmentId;
    }
  }
});

export const deleteTimlAssessment = mutation({
  args: {
    assessmentId: v.id("timlAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      throw new Error("Assessment not found");
    }

    await ctx.db.delete(args.assessmentId);
    return null;
  }
});

// Internal action for PDF generation
export const generatePDFAndUpdateRecord = internalAction({
  args: {
    assessmentId: v.id("timlAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Fetch the assessment data
      const assessment = await ctx.runQuery(
        internal.careFiles.timl.getAssessmentForPDF,
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
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/timl`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/timl`, {
        method: "POST",
        headers,
        body: JSON.stringify(assessment)
      });

      console.log("PDF API request details:", {
        url: `${pdfApiUrl}/api/pdf/timl`,
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
      await ctx.runMutation(internal.careFiles.timl.updatePDFFileId, {
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

export const getAssessmentForPDF = internalQuery({
  args: {
    assessmentId: v.id("timlAssessments")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);

    if (!assessment) {
      return null;
    }

    // Get resident information for the PDF
    const resident = await ctx.db.get(assessment.residentId);

    return {
      ...assessment,
      residentName: resident
        ? `${resident.firstName} ${resident.lastName}`
        : "Unknown Resident",
      bedroomNumber: resident?.roomNumber || "Unknown Room"
    };
  }
});

/**
 * Update assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("timlAssessments"),
    pdfFileId: v.id("_storage")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.pdfFileId,
      pdfGeneratedAt: Date.now()
    });
    return null;
  }
});

/**
 * Get PDF URL for a TIML assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("timlAssessments")
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
