import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.string(),
    nhsHealthNumber: v.optional(v.string()),
    healthConditions: v.optional(v.union(
      v.array(v.string()),
      v.array(v.object({
        condition: v.string()
      }))
    )),
    risks: v.optional(v.union(
      v.array(v.string()),
      v.array(v.object({
        risk: v.string()
      }))
    )),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    createdBy: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const residentId = await ctx.db.insert("residents", {
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      phoneNumber: args.phoneNumber,
      roomNumber: args.roomNumber,
      admissionDate: args.admissionDate,
      nhsHealthNumber: args.nhsHealthNumber,
      healthConditions: args.healthConditions,
      risks: args.risks,
      allergies: args.allergies,
      medications: args.medications,
      medicalConditions: args.medicalConditions,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      isActive: true
    });

    return residentId;
  }
});

export const createEmergencyContact = mutation({
  args: {
    residentId: v.id("residents"),
    name: v.string(),
    phoneNumber: v.string(),
    relationship: v.string(),
    isPrimary: v.optional(v.boolean()),
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const contactId = await ctx.db.insert("emergencyContacts", {
      residentId: args.residentId,
      name: args.name,
      phoneNumber: args.phoneNumber,
      relationship: args.relationship,
      isPrimary: args.isPrimary ?? false,
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now
    });

    return contactId;
  }
});

export const getByOrganization = query({
  args: {
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return residents;
  }
});

export const getById = query({
  args: {
    residentId: v.id("residents")
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) return null;

    const emergencyContacts = await ctx.db
      .query("emergencyContacts")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    return {
      ...resident,
      emergencyContacts
    };
  }
});