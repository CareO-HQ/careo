import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all trust incident reports for an incident
export const getByIncidentId = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trustIncidentReports")
      .withIndex("by_incidentId", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();
  },
});

// Get all trust incident reports for a resident
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trustIncidentReports")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Get trust incident reports by type
export const getByReportType = query({
  args: { 
    reportType: v.union(
      v.literal("nhs"),
      v.literal("ps1"),
      v.literal("trust_internal")
    ),
    incidentId: v.optional(v.id("incidents"))
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("trustIncidentReports")
      .withIndex("by_reportType", (q) => q.eq("reportType", args.reportType));
    
    if (args.incidentId) {
      const reports = await query.collect();
      return reports.filter(report => report.incidentId === args.incidentId);
    }
    
    return await query.order("desc").collect();
  },
});

// Create a new trust incident report
export const create = mutation({
  args: {
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
    reportData: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("trustIncidentReports", {
      ...args,
      createdAt: new Date().toISOString()
    });
    return reportId;
  },
});

// Update an existing trust incident report
export const update = mutation({
  args: {
    reportId: v.id("trustIncidentReports"),
    trustName: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    reportData: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const { reportId, ...updateData } = args;
    
    const existingReport = await ctx.db.get(reportId);
    if (!existingReport) {
      throw new Error("Report not found");
    }
    
    await ctx.db.patch(reportId, updateData);
    return reportId;
  },
});

// Delete a trust incident report
export const deleteReport = mutation({
  args: { reportId: v.id("trustIncidentReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    
    await ctx.db.delete(args.reportId);
    return { success: true };
  },
});

// Get a single trust incident report by ID
export const getById = query({
  args: { reportId: v.id("trustIncidentReports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reportId);
  },
});