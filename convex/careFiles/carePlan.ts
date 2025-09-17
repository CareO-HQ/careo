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

    // Basic information
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

    // Basic information
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

export const getPDFUrl = query({
  args: {
    assessmentId: v.id("carePlanAssessments")
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) {
      return null;
    }

    // Generate PDF via API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/pdf/care-plan?assessmentId=${args.assessmentId}`;
  }
});
