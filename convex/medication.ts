import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { betterAuthComponent } from "./auth";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
      prescriberName: v.string(),
      startDate: v.number(),
      endDate: v.optional(v.number()),
      status: v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    })
  },
  returns: v.id("medication"),
  handler: async (ctx, args) => {
    const { medication } = args;

    // Get current session for organization and authentication
    const session = await ctx.runQuery(
      components.betterAuth.lib.getCurrentSession
    );

    if (!session || !session.token) {
      throw new Error("Not authenticated");
    }

    // Get current user information
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      throw new Error("User not found");
    }

    // Get current organization from session
    const currentOrganizationId = session.activeOrganizationId;
    if (!currentOrganizationId) {
      throw new Error("No active organization found");
    }

    // Get current user's active team
    const userData = await ctx.db.get(userMetadata.userId as Id<"users">);
    const currentTeamId = userData?.activeTeamId;
    if (!currentTeamId) {
      throw new Error("No active team found");
    }

    const medicationData = {
      ...medication,
      createdByUserId: userMetadata.userId,
      organizationId: currentOrganizationId,
      teamId: currentTeamId
    };

    const medicationId = await ctx.db.insert("medication", medicationData);
    return medicationId;
  }
});
