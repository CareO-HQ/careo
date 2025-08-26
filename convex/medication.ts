import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createMedication = mutation({
  args: {
    medication: v.object({
      name: v.string(),
      strength: v.string(),
      strengthUnit: v.union(v.literal("mg"), v.literal("g")),
      totalCount: v.number(),
      dosageForm: v.union(
        v.literal("Tablet"),
        v.literal("Capsule"),
        v.literal("Liquid"),
        v.literal("Injection"),
        v.literal("Cream"),
        v.literal("Ointment"),
        v.literal("Patch"),
        v.literal("Inhaler")
      ),
      route: v.union(
        v.literal("Oral"),
        v.literal("Topical"),
        v.literal("Intramuscular (IM)"),
        v.literal("Intravenous (IV)"),
        v.literal("Subcutaneous"),
        v.literal("Inhalation"),
        v.literal("Rectal"),
        v.literal("Sublingual")
      ),
      frequency: v.union(
        v.literal("Once daily (OD)"),
        v.literal("Twice daily (BD)"),
        v.literal("Three times daily (TD)"),
        v.literal("Four times daily (QDS)"),
        v.literal("Four times daily (QIS)"),
        v.literal("As Needed (PRN)"),
        v.literal("One time (STAT)"),
        v.literal("Weekly"),
        v.literal("Monthly")
      ),
      scheduleType: v.union(
        v.literal("Scheduled"),
        v.literal("PRN (As Needed)")
      ),
      times: v.array(v.string()),
      instructions: v.optional(v.string()),
      prescriberId: v.string(),
      prescriberName: v.string(),
      prescribedAt: v.number(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      organizationId: v.string(),
      teamId: v.string()
    })
  },
  returns: v.id("medication"),
  handler: async (ctx, args) => {
    const { medication } = args;

    // TODO: Get these values from the current user context
    const medicationData = {
      ...medication,
      createdByUserId: "temp-user-id", // Replace with actual user ID
      teamId: "temp-team-id", // Replace with actual team ID
      organizationId: "temp-org-id" // Replace with actual org ID
    };

    const medicationId = await ctx.db.insert("medication", medicationData);
    return medicationId;
  }
});
