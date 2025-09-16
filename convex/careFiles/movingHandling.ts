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
 * Submit a moving and handling assessment form
 */
export const submitMovingHandlingAssessment = mutation({
  args: {
    residentId: v.id("residents"),
    teamId: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    savedAsDraft: v.optional(v.boolean()),

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
    completionDate: v.string()
  },
  returns: v.id("movingHandlingAssessments"),
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

    // Create the moving handling assessment
    const assessmentId = await ctx.db.insert("movingHandlingAssessments", {
      ...args,
      createdAt: Date.now(),
      createdBy: user._id,
      savedAsDraft: args.savedAsDraft ?? false
    });

    // Schedule PDF generation after successful save if not a draft
    if (!args.savedAsDraft) {
      await ctx.scheduler.runAfter(
        0,
        internal.careFiles.movingHandling.generatePDFAndUpdateRecord,
        {
          assessmentId: assessmentId
        }
      );
    }

    return assessmentId;
  }
});

/**
 * Get a moving handling assessment by ID
 */
export const getMovingHandlingAssessment = query({
  args: {
    id: v.id("movingHandlingAssessments")
  },
  returns: v.union(
    v.object({
      _id: v.id("movingHandlingAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      savedAsDraft: v.optional(v.boolean()),

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
 * Get moving handling assessments for a specific resident
 */
export const getMovingHandlingAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.array(
    v.object({
      _id: v.id("movingHandlingAssessments"),
      _creationTime: v.number(),
      residentId: v.id("residents"),
      teamId: v.string(),
      organizationId: v.string(),
      savedAsDraft: v.optional(v.boolean()),
      residentName: v.string(),
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
      .query("movingHandlingAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .collect();

    return assessments.map((assessment) => ({
      _id: assessment._id,
      _creationTime: assessment._creationTime,
      residentId: assessment.residentId,
      teamId: assessment.teamId,
      organizationId: assessment.organizationId,
      savedAsDraft: assessment.savedAsDraft,
      residentName: assessment.residentName,
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
 * Update an existing moving handling assessment (for drafts)
 */
export const updateMovingHandlingAssessment = mutation({
  args: {
    id: v.id("movingHandlingAssessments"),
    updates: v.object({
      savedAsDraft: v.optional(v.boolean()),

      // Section 1: Resident information
      residentName: v.optional(v.string()),
      dateOfBirth: v.optional(v.number()),
      bedroomNumber: v.optional(v.string()),
      weight: v.optional(v.number()),
      height: v.optional(v.number()),
      historyOfFalls: v.optional(v.boolean()),

      // Section 2: Mobility Assessment
      independentMobility: v.optional(v.boolean()),
      canWeightBear: v.optional(
        v.union(
          v.literal("FULLY"),
          v.literal("PARTIALLY"),
          v.literal("WITH-AID"),
          v.literal("NO-WEIGHTBEARING")
        )
      ),
      limbUpperRight: v.optional(
        v.union(v.literal("FULLY"), v.literal("PARTIALLY"), v.literal("NONE"))
      ),
      limbUpperLeft: v.optional(
        v.union(v.literal("FULLY"), v.literal("PARTIALLY"), v.literal("NONE"))
      ),
      limbLowerRight: v.optional(
        v.union(v.literal("FULLY"), v.literal("PARTIALLY"), v.literal("NONE"))
      ),
      limbLowerLeft: v.optional(
        v.union(v.literal("FULLY"), v.literal("PARTIALLY"), v.literal("NONE"))
      ),
      equipmentUsed: v.optional(v.string()),
      needsRiskStaff: v.optional(v.string()),

      // Section 3: Sensory and Behavioral Risk Factors
      deafnessState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      deafnessComments: v.optional(v.string()),
      blindnessState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      blindnessComments: v.optional(v.string()),
      unpredictableBehaviourState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      unpredictableBehaviourComments: v.optional(v.string()),
      uncooperativeBehaviourState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      uncooperativeBehaviourComments: v.optional(v.string()),

      // Section 4: Cognitive and Emotional Risk Factors
      distressedReactionState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      distressedReactionComments: v.optional(v.string()),
      disorientatedState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      disorientatedComments: v.optional(v.string()),
      unconsciousState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      unconsciousComments: v.optional(v.string()),
      unbalanceState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      unbalanceComments: v.optional(v.string()),

      // Section 5: Physical Risk Factors
      spasmsState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      spasmsComments: v.optional(v.string()),
      stiffnessState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      stiffnessComments: v.optional(v.string()),
      cathetersState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      cathetersComments: v.optional(v.string()),
      incontinenceState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      incontinenceComments: v.optional(v.string()),

      // Section 6: Additional Risk Factors
      localisedPain: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      localisedPainComments: v.optional(v.string()),
      otherState: v.optional(
        v.union(v.literal("ALWAYS"), v.literal("SOMETIMES"), v.literal("NEVER"))
      ),
      otherComments: v.optional(v.string()),

      // Section 7: Assessment Completion
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
      throw new Error("Moving handling assessment not found");
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
        internal.careFiles.movingHandling.generatePDFAndUpdateRecord,
        {
          assessmentId: args.id
        }
      );
    }

    return null;
  }
});

/**
 * Check if a moving handling assessment exists for a resident
 */
export const hasMovingHandlingAssessment = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const assessment = await ctx.db
      .query("movingHandlingAssessments")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .first();

    return assessment !== null;
  }
});

/**
 * Delete a moving handling assessment
 */
export const deleteMovingHandlingAssessment = mutation({
  args: {
    id: v.id("movingHandlingAssessments")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the assessment exists
    const existingAssessment = await ctx.db.get(args.id);
    if (!existingAssessment) {
      throw new Error("Moving handling assessment not found");
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
    assessmentId: v.id("movingHandlingAssessments")
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
        `${pdfApiUrl}/api/pdf/moving-handling`
      );
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/moving-handling`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assessmentId: args.assessmentId })
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
      await ctx.runMutation(internal.careFiles.movingHandling.updatePDFFileId, {
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
 * Update a moving handling assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("movingHandlingAssessments"),
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
 * Get PDF URL for a moving handling assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("movingHandlingAssessments")
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
