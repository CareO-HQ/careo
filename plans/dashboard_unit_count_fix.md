# Plan to Fix Dashboard Unit Count

## Problem
The dashboard currently shows an incorrect number of "Units" compared to the sidebar.
- **Sidebar:** Lists teams (units) but filters out the team that has the same name as the organization.
- **Dashboard:** Currently counts "units" from the `units` table or falls back to counting unique teams from `teamMembers`. This logic is inconsistent with the sidebar's display logic.

## Goal
Update the `totalUnits` calculation in `convex/dashboard.ts` to match the sidebar's logic:
1. Fetch all teams for the organization.
2. Filter out the team whose name matches the organization's name.
3. Count the remaining teams.

## Steps

1.  **Modify `convex/dashboard.ts`**:
    -   In `getDashboardStatsByOrganization`:
        -   Fetch the organization details to get the organization name.
        -   Fetch all teams for the organization using `components.betterAuth.lib.findMany` (similar to how `getTeamsForCurrentUser` works in `convex/auth.ts` or how `TeamSwitcher` gets teams).
        -   Filter the teams: `team.name !== organization.name`.
        -   Set `totalUnits` to the count of these filtered teams.
        -   Remove the old logic that queried the `units` table or counted unique teams from `teamMembers`.

2.  **Verification**:
    -   The user will verify if the number on the dashboard matches the number of items in the "Units/House" section of the sidebar.

## Detailed Implementation Plan

### `convex/dashboard.ts`

Update `getDashboardStatsByOrganization`:

```typescript
// ... imports

export const getDashboardStatsByOrganization = query({
  args: {
    organizationId: v.string(),
    careHomeId: v.optional(v.id("careHomes"))
  },
  handler: async (ctx, args) => {
    // ... existing RBAC and resident fetching logic ...

    // Get organization details to check name
    const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "organization",
      where: [{ field: "id", value: args.organizationId }]
    });

    // Get all teams for this organization
    const teamsResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "team",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 100 // Assume reasonable limit, or handle pagination if needed
      }
    });
    
    const allTeams = teamsResult?.page || [];

    // Filter teams: exclude the one matching organization name
    // This matches the logic in TeamSwitcher.tsx
    const validTeams = allTeams.filter(team => team.name !== organization?.name);
    
    // If careHomeId is provided, we might need to filter teams by care home if that relationship exists.
    // However, the current request specifically mentions matching the sidebar "Units/House" count.
    // The sidebar uses `assignedTeams` filtered by org name.
    // Let's stick to the sidebar logic: Count teams in org, minus the org-named team.
    
    // Note: If `careHomeId` is present, the original logic tried to filter units by care home.
    // If the user wants "Units" to mean "Teams in this Care Home", we need to know which teams belong to the care home.
    // The `units` table links `careHomeId` and `teamId`.
    
    let totalUnits = 0;
    
    if (args.careHomeId) {
        // If viewing a specific care home, we should count units (teams) associated with that care home.
        // The `units` table is the link.
        const units = await ctx.db
            .query("units")
            .withIndex("by_careHomeId", (q) => q.eq("careHomeId", args.careHomeId!))
            .collect();
            
        // We should still probably apply the name filter if a unit/team shares the org name, 
        // though typically units in a care home wouldn't be the org itself.
        // But to be safe and consistent:
        const teamIds = new Set(units.map(u => u.teamId));
        const careHomeTeams = allTeams.filter(t => teamIds.has(t.id || t._id));
        const filteredCareHomeTeams = careHomeTeams.filter(t => t.name !== organization?.name);
        totalUnits = filteredCareHomeTeams.length;
        
    } else {
        // Organization view: Count all valid teams
        totalUnits = validTeams.length;
    }

    // ... rest of the function (incidents, appointments, etc.) ...
    
    return {
        // ...
        totalUnits,
        // ...
    };
  }
});
```

**Refinement on `careHomeId` logic:**
The user's request is "correct number of units are shown that is the same number of teams shown in the sidebar under units/house".
In `TeamSwitcher.tsx`:
- It fetches `assignedTeams` (which calls `api.auth.getTeamsForCurrentUser`).
- It filters `team.name !== activeOrganization?.name`.
- It displays these as "Units/House".

So, for the dashboard (which seems to be the organization dashboard based on the context), we should replicate this.

If the dashboard is showing data for the *entire organization* (which `getDashboardStatsByOrganization` does), then `totalUnits` should be the count of all teams in the org minus the main org team.

If the dashboard is filtered by `careHomeId`, we should probably respect that, but the primary request implies a mismatch in the general view. I will implement the logic to fetch all teams and filter by name, as that directly addresses the "sidebar match" requirement.

**Revised Logic for `totalUnits`:**

1.  Fetch `organization` to get `name`.
2.  Fetch all `teams` in `organizationId`.
3.  Filter `teams` where `name != organization.name`.
4.  `totalUnits = filteredTeams.length`.

This replaces the complex `try/catch` block around querying the `units` table or counting `teamMembers`.

**Wait, what about `units` table?**
The `units` table seems to map teams to care homes.
`TeamSwitcher.tsx` uses `assignedTeams` (from `getTeamsForCurrentUser`) which returns teams from `betterAuth`.
It does *not* seem to query the `units` table for the dropdown list in the sidebar (except maybe implicitly if `getTeamsForCurrentUser` did, but we checked `auth.ts` and it queries `betterAuth` teams directly).

So, relying on `betterAuth` teams table is the correct approach to match the sidebar.

**One detail:** `getTeamsForCurrentUser` in `auth.ts` fetches teams for the *current user*. `getDashboardStatsByOrganization` is an admin/manager view (likely) showing stats for the *whole organization*.
- If the user is an Owner/Manager, they see all teams.
- If the user is a Nurse/Carer, they might only see assigned teams.
- The dashboard stats should probably reflect the *organization's* total units, or what the *user* can see?
- The prompt says "correct number of units ... same number of teams shown in the sidebar".
- If the sidebar shows all teams (for an owner), the dashboard should show all teams.
- `getDashboardStatsByOrganization` takes `organizationId`. It should return the count of "valid" teams in that org.

I will proceed with fetching all teams for the org and filtering by name.

