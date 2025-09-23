import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new Hospital Passport
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    generalDetails: v.object({
      personName: v.string(),
      knownAs: v.string(),
      dateOfBirth: v.string(),
      nhsNumber: v.string(),
      religion: v.optional(v.string()),
      weightOnTransfer: v.optional(v.string()),
      careType: v.optional(v.union(v.literal("nursing"), v.literal("residential"), v.literal("ld"), v.literal("mental_health"))),
      transferDateTime: v.string(),
      accompaniedBy: v.optional(v.string()),
      englishFirstLanguage: v.union(v.literal("yes"), v.literal("no")),
      firstLanguage: v.optional(v.string()),
      careHomeName: v.string(),
      careHomeAddress: v.string(),
      careHomePhone: v.string(),
      hospitalName: v.string(),
      hospitalAddress: v.string(),
      hospitalPhone: v.optional(v.string()),
      nextOfKinName: v.string(),
      nextOfKinAddress: v.string(),
      nextOfKinPhone: v.string(),
      gpName: v.string(),
      gpAddress: v.string(),
      gpPhone: v.string(),
      careManagerName: v.optional(v.string()),
      careManagerAddress: v.optional(v.string()),
      careManagerPhone: v.optional(v.string()),
    }),
    medicalCareNeeds: v.object({
      situation: v.string(),
      background: v.string(),
      assessment: v.string(),
      recommendations: v.string(),
      pastMedicalHistory: v.string(),
      knownAllergies: v.optional(v.string()),
      historyOfConfusion: v.optional(v.union(v.literal("yes"), v.literal("no"), v.literal("sometimes"))),
      learningDisabilityMentalHealth: v.optional(v.string()),
      communicationIssues: v.optional(v.string()),
      hearingAid: v.boolean(),
      glasses: v.boolean(),
      otherAids: v.optional(v.string()),
      mobilityAssistance: v.union(v.literal("independent"), v.literal("minimum"), v.literal("full")),
      mobilityAids: v.optional(v.string()),
      historyOfFalls: v.boolean(),
      dateOfLastFall: v.optional(v.string()),
      toiletingAssistance: v.union(v.literal("independent"), v.literal("minimum"), v.literal("full")),
      continenceStatus: v.optional(v.union(v.literal("continent"), v.literal("urine"), v.literal("faeces"), v.literal("both"), v.literal("na"))),
      nutritionalAssistance: v.union(v.literal("independent"), v.literal("minimum"), v.literal("full")),
      dietType: v.optional(v.string()),
      swallowingDifficulties: v.boolean(),
      enteralNutrition: v.boolean(),
      mustScore: v.optional(v.string()),
      personalHygieneAssistance: v.union(v.literal("independent"), v.literal("minimum"), v.literal("full")),
      topDentures: v.boolean(),
      bottomDentures: v.boolean(),
      denturesAccompanying: v.boolean(),
    }),
    skinMedicationAttachments: v.object({
      skinIntegrityAssistance: v.union(v.literal("independent"), v.literal("minimum"), v.literal("full")),
      bradenScore: v.optional(v.string()),
      skinStateOnTransfer: v.string(),
      currentSkinCareRegime: v.optional(v.string()),
      pressureRelievingEquipment: v.optional(v.string()),
      knownToTVN: v.boolean(),
      tvnName: v.optional(v.string()),
      currentMedicationRegime: v.string(),
      lastMedicationDateTime: v.string(),
      lastMealDrinkDateTime: v.optional(v.string()),
      attachments: v.object({
        currentMedications: v.boolean(),
        bodyMap: v.boolean(),
        observations: v.boolean(),
        dnacprForm: v.boolean(),
        enteralFeedingRegime: v.boolean(),
        other: v.boolean(),
        otherSpecify: v.optional(v.string()),
      }),
    }),
    signOff: v.object({
      signature: v.string(),
      printedName: v.string(),
      designation: v.string(),
      contactPhone: v.string(),
      completedDate: v.string(),
    }),
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    status: v.optional(v.union(v.literal("draft"), v.literal("completed"))),
  },
  returns: v.id("hospitalPassports"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const hospitalPassportId = await ctx.db.insert("hospitalPassports", {
      residentId: args.residentId,
      generalDetails: args.generalDetails,
      medicalCareNeeds: args.medicalCareNeeds,
      skinMedicationAttachments: args.skinMedicationAttachments,
      signOff: args.signOff,
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: args.createdBy,
      createdAt: now,
      status: args.status || "completed",
    });

    return hospitalPassportId;
  }
});

// Get Hospital Passports by resident ID
export const getByResidentId = query({
  args: { residentId: v.id("residents") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalPassports")
      .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
      .order("desc")
      .collect();
  },
});

// Get Hospital Passports by organization
export const getByOrganization = query({
  args: { organizationId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalPassports")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .collect();
  },
});

// Get Hospital Passports by team
export const getByTeam = query({
  args: { teamId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hospitalPassports")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// Get a specific Hospital Passport by ID
export const getById = query({
  args: { hospitalPassportId: v.id("hospitalPassports") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.hospitalPassportId);
  },
});

// Update Hospital Passport status
export const updateStatus = mutation({
  args: {
    hospitalPassportId: v.id("hospitalPassports"),
    status: v.union(v.literal("draft"), v.literal("completed")),
  },
  returns: v.id("hospitalPassports"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.hospitalPassportId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.hospitalPassportId;
  }
});

// Delete Hospital Passport
export const deleteHospitalPassport = mutation({
  args: { hospitalPassportId: v.id("hospitalPassports") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.hospitalPassportId);
    return true;
  }
});