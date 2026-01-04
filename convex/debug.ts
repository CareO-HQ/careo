import { query } from "./_generated/server";
import { v } from "convex/values";

export const inspectData = query({
    args: {},
    handler: async (ctx) => {
        // Check teamMembers table
        const teamMembers = await ctx.db.query("teamMembers").collect();

        // Group by teamId to see counts
        const countsByTeam: Record<string, number> = {};
        teamMembers.forEach(tm => {
            countsByTeam[tm.teamId] = (countsByTeam[tm.teamId] || 0) + 1;
        });

        return {
            totalCount: teamMembers.length,
            countsByTeam,
            sample: teamMembers.slice(0, 5),
        };
    },
});
