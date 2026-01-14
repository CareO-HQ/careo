/**
 * RBAC Migration Script
 * 
 * Migrates existing data to the new RBAC structure:
 * - Organizations → Care Homes (one per organization initially)
 * - Better Auth Teams → Units
 * - teamMembers → unitStaff
 * - Sets activeUnitId from activeTeamId
 * 
 * Run this migration once after deploying the new RBAC schema.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { components } from "../_generated/api";

/**
 * Migrate existing data to RBAC structure
 * 
 * This is an internal mutation that should be run manually via the Convex dashboard
 * or via a one-time script.
 */
export const migrateToRBAC = internalMutation({
  args: {},
  returns: v.object({
    careHomesCreated: v.number(),
    unitsCreated: v.number(),
    unitStaffCreated: v.number(),
    usersUpdated: v.number(),
    success: v.boolean()
  }),
  handler: async (ctx) => {
    let careHomesCreated = 0;
    let unitsCreated = 0;
    let unitStaffCreated = 0;
    let usersUpdated = 0;

    try {
      // Step 1: Get all Better Auth organizations
      const organizationsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "organization",
        where: [],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      const organizations = organizationsResult?.page || [];
      console.log(`[migrateToRBAC] Found ${organizations.length} organizations`);

      // Step 2: Create care homes for each organization
      // Use a system user ID for createdBy (or get from first user)
      const firstUser = await ctx.db.query("users").first();
      const systemUserId = firstUser ? "system" : "migration";

      for (const org of organizations) {
        // Check if care home already exists for this organization
        const existingCareHome = await ctx.db
          .query("careHomes")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", org.id))
          .first();

        if (!existingCareHome) {
          // Create care home with organization name
          const careHomeId = await ctx.db.insert("careHomes", {
            organizationId: org.id,
            name: org.name || `Care Home for ${org.id}`,
            createdBy: systemUserId,
            createdAt: Date.now()
          });
          careHomesCreated++;
          console.log(`[migrateToRBAC] Created care home for organization ${org.id}`);
          
          // Set this as the active care home for the organization owner
          // Find owner members of this organization
          const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "member",
            where: [
              { field: "organizationId", value: org.id },
              { field: "role", value: "owner" }
            ],
            paginationOpts: {
              cursor: null,
              numItems: 100
            }
          });
          
          // Set active care home for owner users
          if (members?.page) {
            for (const member of members.page) {
              // Find user by Better Auth userId
              const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
                model: "user",
                where: [{ field: "id", value: member.userId }]
              });
              
              if (authUser?.email) {
                const user = await ctx.db
                  .query("users")
                  .withIndex("byEmail", (q) => q.eq("email", authUser.email))
                  .first();
                
                if (user && !user.activeCareHomeId) {
                  await ctx.db.patch(user._id, {
                    activeCareHomeId: careHomeId
                  });
                }
              }
            }
          }
        }
      }

      // Step 3: Get all Better Auth teams
      const teamsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "team",
        where: [],
        paginationOpts: {
          cursor: null,
          numItems: 1000
        }
      });

      const teams = teamsResult?.page || [];
      console.log(`[migrateToRBAC] Found ${teams.length} teams`);

      // Step 4: Create units for each team
      for (const team of teams) {
        // Find care home for this organization
        const careHome = await ctx.db
          .query("careHomes")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", team.organizationId))
          .first();

        if (!careHome) {
          console.warn(`[migrateToRBAC] No care home found for organization ${team.organizationId}, skipping team ${team.id}`);
          continue;
        }

        // Check if unit already exists for this team
        const existingUnit = await ctx.db
          .query("units")
          .withIndex("by_teamId", (q) => q.eq("teamId", team.id))
          .first();

        if (!existingUnit) {
          // Create unit
          await ctx.db.insert("units", {
            careHomeId: careHome._id,
            organizationId: team.organizationId,
            name: team.name || `Unit for ${team.id}`,
            teamId: team.id,
            createdBy: systemUserId,
            createdAt: Date.now()
          });
          unitsCreated++;
          console.log(`[migrateToRBAC] Created unit for team ${team.id}`);
        }
      }

      // Step 5: Migrate teamMembers to unitStaff
      const teamMembers = await ctx.db.query("teamMembers").collect();
      console.log(`[migrateToRBAC] Found ${teamMembers.length} team members`);

      for (const teamMember of teamMembers) {
        // Find unit for this team
        const unit = await ctx.db
          .query("units")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamMember.teamId))
          .first();

        if (!unit) {
          console.warn(`[migrateToRBAC] No unit found for team ${teamMember.teamId}, skipping team member`);
          continue;
        }

        // Check if unitStaff already exists
        const existingUnitStaff = await ctx.db
          .query("unitStaff")
          .withIndex("by_unitId", (q) => q.eq("unitId", unit._id))
          .filter((q) => q.eq(q.field("userId"), teamMember.userId))
          .first();

        if (!existingUnitStaff && teamMember.role) {
          // Only migrate if role is nurse or care_assistant
          if (teamMember.role === "nurse" || teamMember.role === "care_assistant") {
            await ctx.db.insert("unitStaff", {
              unitId: unit._id,
              userId: teamMember.userId,
              role: teamMember.role as "nurse" | "care_assistant",
              assignedAt: teamMember.createdAt || Date.now(),
              assignedBy: teamMember.createdBy || systemUserId
            });
            unitStaffCreated++;
            console.log(`[migrateToRBAC] Created unitStaff for user ${teamMember.userId} in unit ${unit._id}`);
          }
        }
      }

      // Step 6: Set activeUnitId from activeTeamId
      const usersWithTeam = await ctx.db
        .query("users")
        .filter((q) => q.neq(q.field("activeTeamId"), undefined))
        .collect();

      console.log(`[migrateToRBAC] Found ${usersWithTeam.length} users with activeTeamId`);

      for (const user of usersWithTeam) {
        if (!user.activeTeamId) continue;

        // Find unit for this team
        const unit = await ctx.db
          .query("units")
          .withIndex("by_teamId", (q) => q.eq("teamId", user.activeTeamId!))
          .first();

        if (unit && !user.activeUnitId) {
          await ctx.db.patch(user._id, {
            activeUnitId: unit._id
          });
          usersUpdated++;
          console.log(`[migrateToRBAC] Set activeUnitId for user ${user._id}`);
        }
      }

      console.log(`[migrateToRBAC] Migration completed successfully`);
      console.log(`[migrateToRBAC] Summary:`, {
        careHomesCreated,
        unitsCreated,
        unitStaffCreated,
        usersUpdated
      });

      return {
        careHomesCreated,
        unitsCreated,
        unitStaffCreated,
        usersUpdated,
        success: true
      };
    } catch (error) {
      console.error(`[migrateToRBAC] Migration failed:`, error);
      throw error;
    }
  }
});
