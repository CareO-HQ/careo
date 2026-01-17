import { query } from "./_generated/server";
import { v } from "convex/values";
import { resolveUser, ROLES } from "./lib/rbac";
import { components } from "./_generated/api";

export const diagnoseManagerVisibility = query({
    args: {
        organizationId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return { error: "Not authenticated" };

        const user = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", identity.email!))
            .first();

        // 1. Resolve User
        let resolvedUser;
        try {
            resolvedUser = await resolveUser(ctx);
        } catch (e: any) {
            resolvedUser = { error: e.message };
        }

        // 2. Check Care Home Managers
        const managerAssignments = await ctx.db
            .query("careHomeManagers")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject!))
            .collect();

        // 3. Check Units and their TeamIds
        const units = await ctx.db.query("units").collect();
        const relevantUnits = units.filter(u => managerAssignments.some(ma => ma.careHomeId === u.careHomeId));

        // 4. Check Residents in Organization
        const residents = await ctx.db
            .query("residents")
            .withIndex("byOrganizationId", (q) => q.eq("organizationId", args.organizationId))
            .collect();

        // 5. Simulate Visibility Logic
        const teamIds = new Set(relevantUnits.map(u => u.teamId));
        const visibleResidents = residents.filter(r => teamIds.has(r.teamId));
        const invisibleResidents = residents.filter(r => !teamIds.has(r.teamId));

        return {
            identity,
            user,
            resolvedUser,
            managerAssignments,
            relevantUnitsCount: relevantUnits.length,
            relevantUnits,
            organizationId: args.organizationId,
            totalResidentsInOrg: residents.length,
            visibleResidentsCount: visibleResidents.length,
            invisibleResidentsCount: invisibleResidents.length,
            invisibleResidentExamples: invisibleResidents.slice(0, 5).map(r => ({ id: r._id, teamId: r.teamId, name: r.firstName + " " + r.lastName })),
            // Better Auth Member Check
            betterAuthMember: "Cannot query directly efficiently here without args from resolvedUser"
        };
    },
});
