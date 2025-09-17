import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    // Section 1: Incident Details (all required)
    date: v.string(),
    time: v.string(),
    homeName: v.string(),
    unit: v.string(),
    
    // Section 2: Injured Person Details
    injuredPersonFirstName: v.string(),
    injuredPersonSurname: v.string(),
    injuredPersonDOB: v.string(),
    residentId: v.optional(v.id("residents")),
    residentInternalId: v.optional(v.string()),
    dateOfAdmission: v.optional(v.string()),
    healthCareNumber: v.optional(v.string()),
    
    // Section 3: Status of Injured Person
    statusResident: v.optional(v.boolean()),
    statusRelative: v.optional(v.boolean()),
    statusStaff: v.optional(v.boolean()),
    statusAgencyStaff: v.optional(v.boolean()),
    statusVisitor: v.optional(v.boolean()),
    statusContractor: v.optional(v.boolean()),
    contractorEmployer: v.optional(v.string()),
    
    // Section 4: Type of Incident
    incidentTypes: v.optional(v.array(v.string())),
    typeOtherDetails: v.optional(v.string()),
    
    // Section 5-6: Fall-Specific Questions
    anticoagulantMedication: v.optional(v.string()),
    fallPathway: v.optional(v.string()),
    
    // Section 7: Detailed Description
    detailedDescription: v.string(),
    
    // Section 8: Incident Level
    incidentLevel: v.string(),
    
    // Section 9: Details of Injury
    injuryDescription: v.optional(v.string()),
    bodyPartInjured: v.optional(v.string()),
    
    // Section 10: Treatment Required
    treatmentTypes: v.optional(v.array(v.string())),
    
    // Section 11: Details of Treatment Given
    treatmentDetails: v.optional(v.string()),
    vitalSigns: v.optional(v.string()),
    treatmentRefused: v.optional(v.boolean()),
    
    // Section 12: Witnesses
    witness1Name: v.optional(v.string()),
    witness1Contact: v.optional(v.string()),
    witness2Name: v.optional(v.string()),
    witness2Contact: v.optional(v.string()),
    
    // Section 13: Further Actions by Nurse
    nurseActions: v.optional(v.array(v.string())),
    
    // Section 14: Further Actions Advised
    furtherActionsAdvised: v.optional(v.string()),
    
    // Section 15: Prevention Measures
    preventionMeasures: v.optional(v.string()),
    
    // Section 16: Home Manager Informed
    homeManagerInformedBy: v.optional(v.string()),
    homeManagerInformedDateTime: v.optional(v.string()),
    
    // Section 17: Out of Hours On-Call
    onCallManagerName: v.optional(v.string()),
    onCallContactedDateTime: v.optional(v.string()),
    
    // Section 18: Next of Kin Informed
    nokInformedWho: v.optional(v.string()),
    nokInformedBy: v.optional(v.string()),
    nokInformedDateTime: v.optional(v.string()),
    
    // Section 19: Trust Incident Form Recipients
    careManagerName: v.optional(v.string()),
    careManagerEmail: v.optional(v.string()),
    keyWorkerName: v.optional(v.string()),
    keyWorkerEmail: v.optional(v.string()),
    
    // Section 20: Form Completion Details
    completedByFullName: v.string(),
    completedByJobTitle: v.string(),
    completedBySignature: v.optional(v.string()),
    dateCompleted: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Convert array fields to individual boolean fields for storage
    const incidentTypesMap: any = {};
    if (args.incidentTypes) {
      args.incidentTypes.forEach(type => {
        incidentTypesMap[`type${type}`] = true;
      });
    }

    const treatmentMap: any = {};
    if (args.treatmentTypes) {
      args.treatmentTypes.forEach(type => {
        treatmentMap[`treatment${type}`] = true;
      });
    }

    const nurseActionsMap: any = {};
    if (args.nurseActions) {
      args.nurseActions.forEach(action => {
        nurseActionsMap[`action${action}`] = true;
      });
    }

    const incident = await ctx.db.insert("incidents", {
      // Section 1
      date: args.date,
      time: args.time,
      homeName: args.homeName,
      unit: args.unit,
      
      // Section 2
      injuredPersonFirstName: args.injuredPersonFirstName,
      injuredPersonSurname: args.injuredPersonSurname,
      injuredPersonDOB: args.injuredPersonDOB,
      residentId: args.residentId,
      residentInternalId: args.residentInternalId,
      dateOfAdmission: args.dateOfAdmission,
      healthCareNumber: args.healthCareNumber,
      
      // Section 3
      statusResident: args.statusResident,
      statusRelative: args.statusRelative,
      statusStaff: args.statusStaff,
      statusAgencyStaff: args.statusAgencyStaff,
      statusVisitor: args.statusVisitor,
      statusContractor: args.statusContractor,
      contractorEmployer: args.contractorEmployer,
      
      // Section 4 - Spread individual incident type booleans
      ...incidentTypesMap,
      typeOtherDetails: args.typeOtherDetails,
      
      // Section 5-6
      anticoagulantMedication: args.anticoagulantMedication,
      fallPathway: args.fallPathway,
      
      // Section 7
      detailedDescription: args.detailedDescription,
      
      // Section 8
      incidentLevel: args.incidentLevel,
      
      // Section 9
      injuryDescription: args.injuryDescription,
      bodyPartInjured: args.bodyPartInjured,
      
      // Section 10 - Spread individual treatment booleans
      ...treatmentMap,
      
      // Section 11
      treatmentDetails: args.treatmentDetails,
      vitalSigns: args.vitalSigns,
      treatmentRefused: args.treatmentRefused,
      
      // Section 12
      witness1Name: args.witness1Name,
      witness1Contact: args.witness1Contact,
      witness2Name: args.witness2Name,
      witness2Contact: args.witness2Contact,
      
      // Section 13 - Spread individual action booleans
      ...nurseActionsMap,
      
      // Section 14
      furtherActionsAdvised: args.furtherActionsAdvised,
      
      // Section 15
      preventionMeasures: args.preventionMeasures,
      
      // Section 16
      homeManagerInformedBy: args.homeManagerInformedBy,
      homeManagerInformedDateTime: args.homeManagerInformedDateTime,
      
      // Section 17
      onCallManagerName: args.onCallManagerName,
      onCallContactedDateTime: args.onCallContactedDateTime,
      
      // Section 18
      nokInformedWho: args.nokInformedWho,
      nokInformedBy: args.nokInformedBy,
      nokInformedDateTime: args.nokInformedDateTime,
      
      // Section 19
      careManagerName: args.careManagerName,
      careManagerEmail: args.careManagerEmail,
      keyWorkerName: args.keyWorkerName,
      keyWorkerEmail: args.keyWorkerEmail,
      
      // Section 20
      completedByFullName: args.completedByFullName,
      completedByJobTitle: args.completedByJobTitle,
      completedBySignature: args.completedBySignature,
      dateCompleted: args.dateCompleted,
      
      // Metadata
      status: "reported",
      createdAt: Date.now(),
      createdBy: user._id,
    });

    return incident;
  },
});

export const getByResident = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();

    return incidents;
  },
});

export const getAll = query({
  args: { 
    limit: v.optional(v.number()),
    homeName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    if (args.homeName) {
      const incidents = await ctx.db
        .query("incidents")
        .withIndex("by_home", (q) => q.eq("homeName", args.homeName!))
        .order("desc")
        .take(limit);
      return incidents;
    } else {
      const incidents = await ctx.db
        .query("incidents")
        .order("desc")
        .take(limit);
      return incidents;
    }
  },
});

export const getById = query({
  args: { incidentId: v.id("incidents") },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    return incident;
  },
});

export const getIncidentStats = query({
  args: { 
    residentId: v.optional(v.id("residents")),
    homeName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let incidents;
    
    if (args.residentId) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
        .collect();
    } else if (args.homeName) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_home", (q) => q.eq("homeName", args.homeName!))
        .collect();
    } else {
      incidents = await ctx.db
        .query("incidents")
        .collect();
    }

    const totalIncidents = incidents.length;
    const fallsCount = incidents.filter(i => i.typeFallWitnessed || i.typeFallUnwitnessed).length;
    const medicationErrors = incidents.filter(i => i.typeMedication).length;
    
    const levelBreakdown = {
      death: incidents.filter(i => i.incidentLevel === "death").length,
      permanentHarm: incidents.filter(i => i.incidentLevel === "permanent_harm").length,
      minorInjury: incidents.filter(i => i.incidentLevel === "minor_injury").length,
      noHarm: incidents.filter(i => i.incidentLevel === "no_harm").length,
      nearMiss: incidents.filter(i => i.incidentLevel === "near_miss").length,
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentIncidents = incidents.filter(i => 
      new Date(i.date) >= thirtyDaysAgo
    );

    const lastIncidentDate = incidents.length > 0 
      ? Math.max(...incidents.map(i => new Date(i.date).getTime()))
      : null;

    const daysSinceLastIncident = lastIncidentDate
      ? Math.floor((now.getTime() - lastIncidentDate) / (1000 * 60 * 60 * 24))
      : null;

    return {
      totalIncidents,
      fallsCount,
      medicationErrors,
      levelBreakdown,
      recentIncidents: recentIncidents.length,
      daysSinceLastIncident,
    };
  },
});