import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all team members for a resident
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("multidisciplinaryCareTeam")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
  },
});

// Create a new team member
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    name: v.string(),
    designation: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    specialty: v.string(),
    organisation: v.optional(v.string()),
    email: v.optional(v.string()),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const teamMemberId = await ctx.db.insert("multidisciplinaryCareTeam", {
      residentId: args.residentId,
      name: args.name,
      designation: args.designation,
      phone: args.phone,
      address: args.address,
      specialty: args.specialty,
      organisation: args.organisation,
      email: args.email,
      isActive: true,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });

    return teamMemberId;
  },
});

// Update a team member
export const update = mutation({
  args: {
    id: v.id("multidisciplinaryCareTeam"),
    name: v.optional(v.string()),
    designation: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    specialty: v.optional(v.string()),
    organisation: v.optional(v.string()),
    email: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedBy,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Soft delete a team member
export const remove = mutation({
  args: {
    id: v.id("multidisciplinaryCareTeam"),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedBy: args.updatedBy,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Get team members by organization
export const getByOrganizationId = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("multidisciplinaryCareTeam")
      .withIndex("byOrganization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
  },
});

// Get team members by specialty
export const getBySpecialty = query({
  args: {
    residentId: v.id("residents"),
    specialty: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("multidisciplinaryCareTeam")
      .withIndex("byResident", (q) => q.eq("residentId", args.residentId))
      .filter((q) =>
        q.and(
          q.eq(q.field("specialty"), args.specialty),
          q.neq(q.field("isActive"), false)
        )
      )
      .collect();
  },
});