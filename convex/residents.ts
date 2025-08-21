import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new resident
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.string(),
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

// Create emergency contact for a resident
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

// Create medical info for a resident
export const createMedicalInfo = mutation({
  args: {
    residentId: v.id("residents"),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    insuranceInfo: v.optional(v.string()),
    organizationId: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const medicalInfoId = await ctx.db.insert("medicalInfo", {
      residentId: args.residentId,
      allergies: args.allergies,
      medications: args.medications,
      medicalConditions: args.medicalConditions,
      doctorName: args.doctorName,
      doctorPhone: args.doctorPhone,
      insuranceInfo: args.insuranceInfo,
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now
    });

    return medicalInfoId;
  }
});

// Get residents by organization
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

// Get resident by ID with emergency contacts
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

    const medicalInfo = await ctx.db
      .query("medicalInfo")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .first();

    return {
      ...resident,
      emergencyContacts,
      medicalInfo
    };
  }
});