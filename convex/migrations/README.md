# Progress Notes Stats Migration

## Overview

This migration initializes the `progressNoteStats` table for all existing residents to enable fast count queries.

**Performance Impact:**
- **Before**: 4 queries loading all notes = 3-4 seconds with 5,000 notes
- **After**: 1 query with indexed lookup = <10ms

## When to Run

Run this migration **once** after deploying the schema changes that add the `progressNoteStats` table.

## How to Run

### Option 1: Via Convex Dashboard (Recommended)

1. Open your Convex dashboard
2. Go to **Functions** tab
3. Find `migrations:migrateAllResidents`
4. Click **Run** (no arguments needed)
5. Check the output to confirm all residents were migrated

### Option 2: Via Code (For Testing)

```typescript
// In your dev environment, you can call the mutation
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const migrateAll = useMutation(api.migrations.initializeProgressNoteStats.migrateAllResidents);

// Then call it
await migrateAll({});
```

### Option 3: Single Resident (Production Safe)

If you have a large number of residents and want to migrate gradually:

```typescript
const migrateSingle = useMutation(api.migrations.initializeProgressNoteStats.migrateSingleResident);

// Migrate one resident at a time
await migrateSingle({ residentId: "k578pn3bm02fcr37wt66s2y9qs7pyg2n" });
```

## What Happens

For each resident:
1. Checks if stats already exist (skips if yes)
2. Counts all progress notes by type
3. Creates a `progressNoteStats` record with:
   - `totalCount`
   - `dailyCount`
   - `medicalCount`
   - `incidentCount`
   - `behavioralCount`
   - `otherCount`

## After Migration

Once migration is complete:
- New notes automatically update counters
- Deleted notes decrement counters
- Updated note types adjust counters
- Stats page loads in <10ms instead of seconds

## Verification

Check the migration worked:

1. Open Convex dashboard
2. Go to **Data** tab
3. Select `progressNoteStats` table
4. Verify each resident has a stats record

Or run a query:

```typescript
const stats = await ctx.db.query("progressNoteStats").collect();
console.log(`Migrated ${stats.length} residents`);
```

## Troubleshooting

**Q: Migration timed out**
A: Use `migrateSingleResident` for each resident individually instead of bulk migration.

**Q: Counts seem wrong**
A: The migration runs on existing data. If notes were added during migration, stats may be slightly off. Just delete the stats record and re-run migration for that resident.

**Q: Do I need to run this again?**
A: No. Once migrated, the system maintains counters automatically for all future operations.

## Future Notes

Going forward, all new residents will automatically have their stats initialized when they create their first progress note. This migration is only needed for existing residents who already have notes.
