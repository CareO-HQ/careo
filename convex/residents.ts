import { api } from "./_generated/api";
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
    // GP Details
    gpName: v.optional(v.string()),
    gpAddress: v.optional(v.string()),
    gpPhone: v.optional(v.string()),
    // Care Manager Details
    careManagerName: v.optional(v.string()),
    careManagerAddress: v.optional(v.string()),
    careManagerPhone: v.optional(v.string()),
    healthConditions: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            condition: v.string()
          })
        )
      )
    ),
    risks: v.optional(
      v.union(
        v.array(v.string()),
        v.array(
          v.object({
            risk: v.string(),
            level: v.optional(
              v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
            )
          })
        )
      )
    ),
    dependencies: v.optional(
      v.union(
        v.array(v.string()), // Legacy format for backward compatibility
        v.object({
          mobility: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          eating: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          dressing: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          ),
          toileting: v.union(
            v.literal("Independent"),
            v.literal("Supervision Needed"),
            v.literal("Assistance Needed"),
            v.literal("Fully Dependent")
          )
        })
      )
    ),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string()
  },
  returns: v.id("residents"),
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
      // GP Details
      gpName: args.gpName,
      gpAddress: args.gpAddress,
      gpPhone: args.gpPhone,
      // Care Manager Details
      careManagerName: args.careManagerName,
      careManagerAddress: args.careManagerAddress,
      careManagerPhone: args.careManagerPhone,
      healthConditions: args.healthConditions,
      risks: args.risks,
      dependencies: args.dependencies,
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
    address: v.string(),
    isPrimary: v.optional(v.boolean()),
    organizationId: v.string()
  },
  returns: v.id("emergencyContacts"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const contactId = await ctx.db.insert("emergencyContacts", {
      residentId: args.residentId,
      name: args.name,
      phoneNumber: args.phoneNumber,
      relationship: args.relationship,
      address: args.address,
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
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return residents;
  }
});

export const getById = query({
  args: {
    residentId: v.id("residents")
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args): Promise<any | null> => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) return null;

    const emergencyContacts = await ctx.db
      .query("emergencyContacts")
      .withIndex("byResidentId", (q) => q.eq("residentId", args.residentId))
      .collect();

    const residentImage: { url: string | null; storageId: string } | null =
      await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
        residentId: resident._id as string
      });

    return {
      ...resident,
      emergencyContacts,
      imageUrl: residentImage?.url || "No image"
    };
  }
});

export const getByTeamId = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Process residents with images
    const results: Array<Record<string, unknown>> = [];
    for (const resident of residents) {
      const residentImage: { url: string | null; storageId: string } | null =
        await ctx.runQuery(api.files.image.getResidentImageByResidentId, {
          residentId: resident._id as string
        });
      results.push({
        ...resident,
        imageUrl: residentImage?.url || "No image"
      });
    }

    return results;
  }
});

export const update = mutation({
  args: {
    residentId: v.id("residents"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    roomNumber: v.optional(v.string()),
    admissionDate: v.optional(v.string()),
    nhsHealthNumber: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // GP Details
    gpName: v.optional(v.string()),
    gpAddress: v.optional(v.string()),
    gpPhone: v.optional(v.string()),
    // Care Manager Details
    careManagerName: v.optional(v.string()),
    careManagerAddress: v.optional(v.string()),
    careManagerPhone: v.optional(v.string()),
  },
  returns: v.id("residents"),
  handler: async (ctx, args) => {
    const { residentId, ...updateFields } = args;

    // Remove undefined fields
    const fieldsToUpdate: Record<string, any> = Object.fromEntries(
      Object.entries(updateFields).filter(([_, value]) => value !== undefined)
    );

    // Add updatedAt timestamp
    fieldsToUpdate.updatedAt = Date.now();

    await ctx.db.patch(residentId, fieldsToUpdate);

    return residentId;
  }
});
