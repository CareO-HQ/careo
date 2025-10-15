import { v } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const submitCarePlanAssessment = mutation({
  args: {
    // Metadata
    residentId: v.id("residents"),
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
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Verify resident exists
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    // Insert the care plan assessment
    const carePlanId = await ctx.db.insert("carePlanAssessments", {
      residentId: args.residentId,
      userId: args.userId,
      folderKey: args.folderKey,
      nameOfCarePlan: args.nameOfCarePlan,
      residentName: args.residentName,
      dob: args.dob,
      bedroomNumber: args.bedroomNumber,
      writtenBy: args.writtenBy,
      dateWritten: args.dateWritten,
      carePlanNumber: args.carePlanNumber,
      identifiedNeeds: args.identifiedNeeds,
      aims: args.aims,
      plannedCareDate: args.plannedCareDate,
      discussedWith: args.discussedWith,
      signature: args.signature,
      date: args.date,
      staffSignature: args.staffSignature,
      status: "submitted" as const,
      submittedAt: Date.now()
    });

    // Schedule PDF generation after successful save if not a draft
    await ctx.scheduler.runAfter(
      1000, // 1 second delay
      internal.careFiles.carePlan.generatePDFAndUpdateRecord,
      { assessmentId: carePlanId }
    );

    return carePlanId;
  }
});

export const getCarePlanAssessmentsByResident = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return assessments;
  }
});

export const getCarePlanAssessmentsByResidentAndFolder = query({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("carePlanAssessments")
      .withIndex("by_resident_and_folder", (q) =>
        q.eq("residentId", args.residentId).eq("folderKey", args.folderKey)
      )
      .collect();

    return assessments;
  }
});

export const getCarePlanAssessment = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    return assessment;
  }
});

export const updateCarePlanAssessment = mutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),

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
    staffSignature: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { assessmentId, ...updateData } = args;

    const assessment = await ctx.db.get(assessmentId);
    if (!assessment) {
      throw new Error("Care plan assessment not found");
    }

    await ctx.db.patch(assessmentId, {
      ...updateData,
      updatedAt: Date.now()
    });

    return assessmentId;
  }
});

/**
 * Generate PDF and update the record with the file ID
 */
export const generatePDFAndUpdateRecord = internalAction({
  args: { assessmentId: v.id("carePlanAssessments") },
  handler: async (ctx, args) => {
    try {
      // Get the PDF API URL from environment variables
      const pdfApiUrl = process.env.PDF_API_URL;
      const pdfApiToken = process.env.PDF_API_TOKEN;

      // Check if PDF generation is properly configured
      if (!pdfApiUrl || !pdfApiUrl.startsWith("https://")) {
        console.warn(
          "PDF generation disabled: PDF_API_URL not set or not HTTPS. Set PDF_API_URL=https://your-domain.com"
        );
        return;
      }

      if (!pdfApiToken) {
        console.warn(
          "PDF generation disabled: PDF_API_TOKEN not set in environment variables"
        );
        return;
      }

      // Call the PDF generation API
      console.log("Calling PDF API at:", `${pdfApiUrl}/api/pdf/care-plan`);
      const pdfResponse = await fetch(`${pdfApiUrl}/api/pdf/care-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pdfApiToken}`
        },
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
      console.log("Received PDF buffer of size:", pdfBuffer.byteLength);

      // Store the PDF in Convex file storage
      const storageId = await ctx.storage.store(new Blob([pdfBuffer]));

      // Update the assessment record with the PDF file ID
      await ctx.runMutation(internal.careFiles.carePlan.updatePDFFileId, {
        assessmentId: args.assessmentId,
        storageId
      });

      console.log(
        `Successfully generated and stored PDF for care plan assessment ${args.assessmentId}`
      );
    } catch (error) {
      console.error("Error generating and saving PDF:", error);
    }
  }
});

/**
 * Update a care plan assessment with PDF file ID
 */
export const updatePDFFileId = internalMutation({
  args: {
    assessmentId: v.id("carePlanAssessments"),
    storageId: v.id("_storage")
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      pdfFileId: args.storageId
    });
  }
});

/**
 * Get PDF URL for a care plan assessment
 */
export const getPDFUrl = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      return null;
    }

    // If we have a stored PDF file, return the file URL
    if (assessment.pdfFileId) {
      return await ctx.storage.getUrl(assessment.pdfFileId);
    }

    // Fallback to direct PDF generation via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/pdf/care-plan?assessmentId=${args.assessmentId}`;
  }
});

/**
 * Create dummy care plan assessments for testing
 */
export const createDummyCarePlans = mutation({
  args: {
    residentId: v.id("residents"),
    folderKey: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) {
      throw new Error("Resident not found");
    }

    const dummyCarePlans = [
      {
        nameOfCarePlan: "Mobility and Falls Prevention",
        identifiedNeeds: "Resident requires assistance with mobilisation due to reduced strength in lower limbs. History of falls.",
        aims: "Maintain current mobility level, prevent falls, increase confidence in walking with appropriate aids.",
        plannedCareDate: [
          {
            date: Date.now() - 7 * 24 * 60 * 60 * 1000,
            time: "09:00",
            details: "Physiotherapy exercises - leg strengthening, 15 minutes daily",
            signature: "J. Smith"
          },
          {
            date: Date.now() - 5 * 24 * 60 * 60 * 1000,
            time: "14:00",
            details: "Walking practice with zimmer frame in corridor",
            signature: "M. Jones"
          },
          {
            date: Date.now() - 2 * 24 * 60 * 60 * 1000,
            time: "10:00",
            details: "Review mobility equipment for suitability",
            signature: "A. Williams"
          }
        ]
      },
      {
        nameOfCarePlan: "Nutrition and Hydration",
        identifiedNeeds: "Resident has poor appetite and reduced fluid intake. Weight loss of 3kg in last month. Risk of dehydration and malnutrition.",
        aims: "Improve nutritional intake, maintain adequate hydration, monitor weight weekly, achieve weight stabilisation.",
        plannedCareDate: [
          {
            date: Date.now() - 6 * 24 * 60 * 60 * 1000,
            time: "08:00",
            details: "Fortified breakfast with supplement drink. Record intake.",
            signature: "L. Brown"
          },
          {
            date: Date.now() - 4 * 24 * 60 * 60 * 1000,
            time: "12:00",
            details: "Offer preferred meals - smaller portions more frequently",
            signature: "K. Taylor"
          },
          {
            date: Date.now() - 1 * 24 * 60 * 60 * 1000,
            time: "Throughout day",
            details: "Fluid monitoring - encourage 1500ml daily. Use preferred beverages.",
            signature: "P. Davis"
          }
        ]
      },
      {
        nameOfCarePlan: "Personal Care and Dignity",
        identifiedNeeds: "Resident requires full assistance with personal care. Sensitive about maintaining dignity and privacy.",
        aims: "Provide compassionate personal care while maintaining dignity, encourage independence where possible, respect privacy preferences.",
        plannedCareDate: [
          {
            date: Date.now() - 8 * 24 * 60 * 60 * 1000,
            time: "07:30",
            details: "Morning wash - ensure door closed, explain each step, allow choices on clothing",
            signature: "R. Wilson"
          },
          {
            date: Date.now() - 3 * 24 * 60 * 60 * 1000,
            time: "20:00",
            details: "Evening routine - respect preferred bedtime, assist with night attire",
            signature: "S. Anderson"
          }
        ]
      },
      {
        nameOfCarePlan: "Medication Management",
        identifiedNeeds: "Resident on multiple medications for chronic conditions. Requires administration support and monitoring for side effects.",
        aims: "Ensure safe medication administration, monitor effectiveness and side effects, maintain accurate records.",
        plannedCareDate: [
          {
            date: Date.now() - 9 * 24 * 60 * 60 * 1000,
            time: "08:00 & 20:00",
            details: "Administer prescribed medications with food. Check for any adverse reactions.",
            signature: "T. Martin"
          },
          {
            date: Date.now() - 4 * 24 * 60 * 60 * 1000,
            time: "As needed",
            details: "Monitor blood pressure weekly. Report any readings outside normal range.",
            signature: "N. Clark"
          }
        ]
      },
      {
        nameOfCarePlan: "Social and Emotional Wellbeing",
        identifiedNeeds: "Resident showing signs of low mood and social isolation. Previously enjoyed arts and crafts, visiting with family.",
        aims: "Improve mood and engagement, facilitate family contact, encourage participation in activities, reduce feelings of loneliness.",
        plannedCareDate: [
          {
            date: Date.now() - 10 * 24 * 60 * 60 * 1000,
            time: "10:00",
            details: "Invite to arts and crafts session in lounge. One-to-one support if needed.",
            signature: "E. Roberts"
          },
          {
            date: Date.now() - 6 * 24 * 60 * 60 * 1000,
            time: "15:00",
            details: "Arrange video call with family members. Assist with technology.",
            signature: "H. Thomas"
          },
          {
            date: Date.now() - 2 * 24 * 60 * 60 * 1000,
            time: "Daily",
            details: "Spend 15 minutes chatting about interests, look at photo albums together",
            signature: "C. Walker"
          }
        ]
      }
    ];

    const createdIds = [];

    for (const plan of dummyCarePlans) {
      const carePlanId = await ctx.db.insert("carePlanAssessments", {
        residentId: args.residentId,
        userId: args.userId,
        folderKey: args.folderKey,
        nameOfCarePlan: plan.nameOfCarePlan,
        residentName: resident.fullName,
        dob: resident.dob,
        bedroomNumber: resident.roomNumber || "N/A",
        writtenBy: "Dr. Sarah Thompson",
        dateWritten: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        carePlanNumber: `CP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        identifiedNeeds: plan.identifiedNeeds,
        aims: plan.aims,
        plannedCareDate: plan.plannedCareDate,
        discussedWith: "Resident and family representative",
        signature: resident.fullName,
        date: Date.now(),
        staffSignature: "Dr. Sarah Thompson",
        status: "submitted" as const,
        submittedAt: Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000
      });

      createdIds.push(carePlanId);

      // Schedule PDF generation
      await ctx.scheduler.runAfter(
        1000,
        internal.careFiles.carePlan.generatePDFAndUpdateRecord,
        { assessmentId: carePlanId }
      );
    }

    return createdIds;
  }
});
