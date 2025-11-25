# Critical Medication System Fixes - Implementation Guide

## Summary of Changes Made

### 1. Database Schema Updates (✅ COMPLETED)

#### File: `convex/schema.ts`

**Added to `medication` table:**
```typescript
// Controlled Drug fields
isControlledDrug: v.optional(v.boolean()),
controlledDrugSchedule: v.optional(v.union(
  v.literal("2"),
  v.literal("3"),
  v.literal("4"),
  v.literal("5")
)),
// PRN Safety Limits
minIntervalHours: v.optional(v.number()),
maxDailyDose: v.optional(v.number()),
maxDailyDoseUnit: v.optional(v.string()),
```

**Added to `medicationIntake` table:**
```typescript
// Second witness for controlled drugs
secondWitnessByUserId: v.optional(v.string()),
secondWitnessAt: v.optional(v.number()),
// Actual administrator (who gave the medication)
administratorUserId: v.optional(v.string()),
administratorAt: v.optional(v.number()),
// Destruction tracking for controlled drugs
isDestroyed: v.optional(v.boolean()),
destructionWitnessUserId: v.optional(v.string()),
destructionReason: v.optional(v.string()),
destructionAt: v.optional(v.number()),
```

### 2. Validation Schema Updates (✅ COMPLETED)

#### File: `schemas/medication/CreateMedicationSchema.ts`

**Added fields:**
```typescript
// Controlled Drug fields
isControlledDrug: z.boolean().optional(),
controlledDrugSchedule: z.union([
  z.literal("2"),
  z.literal("3"),
  z.literal("4"),
  z.literal("5")
]).optional(),
// PRN Safety Limits
minIntervalHours: z.number().positive().optional(),
maxDailyDose: z.number().positive().optional(),
maxDailyDoseUnit: z.string().optional()
```

### 3. Create Medication Form Updates (✅ PARTIAL)

#### File: `components/medication/forms/CreateMedicationForm.tsx`

**Updated default values** (completed)

**TODO: Add UI Fields in Step 3** (before line 660):

```typescript
{/* Controlled Drug Section */}
<div className="border-t pt-4 mt-4">
  <h3 className="text-lg font-semibold mb-4">Controlled Drug Information</h3>

  <FormField
    control={form.control}
    name="isControlledDrug"
    render={({ field }) => (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
        <FormControl>
          <input
            type="checkbox"
            checked={field.value}
            onChange={field.onChange}
            className="mt-1"
          />
        </FormControl>
        <div className="space-y-1 leading-none">
          <FormLabel>This is a Controlled Drug</FormLabel>
          <FormDescription>
            UK Schedule 2-5 controlled drugs require dual witness
          </FormDescription>
        </div>
      </FormItem>
    )}
  />

  {form.watch("isControlledDrug") && (
    <FormField
      control={form.control}
      name="controlledDrugSchedule"
      render={({ field }) => (
        <FormItem className="mt-4">
          <FormLabel required>Controlled Drug Schedule</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="2">Schedule 2 (e.g., Morphine, Fentanyl)</SelectItem>
              <SelectItem value="3">Schedule 3 (e.g., Tramadol, Buprenorphine)</SelectItem>
              <SelectItem value="4">Schedule 4 (e.g., Benzodiazepines)</SelectItem>
              <SelectItem value="5">Schedule 5 (e.g., Low-dose Codeine)</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )}
</div>

{/* PRN Safety Limits Section */}
{form.watch("scheduleType") === "PRN (As Needed)" && (
  <div className="border-t pt-4 mt-4">
    <h3 className="text-lg font-semibold mb-4">PRN Safety Limits</h3>
    <FormDescription className="mb-4">
      Set limits to prevent overdose and ensure safe administration
    </FormDescription>

    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="minIntervalHours"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Interval (hours)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g., 4"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormDescription>
              Minimum hours between doses
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="maxDailyDose"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum Daily Dose</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="e.g., 4"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormDescription>
              Max doses in 24 hours
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <FormField
      control={form.control}
      name="maxDailyDoseUnit"
      render={({ field }) => (
        <FormItem className="mt-4">
          <FormLabel>Dose Unit</FormLabel>
          <FormControl>
            <Input placeholder="e.g., tablets, mg, mL" {...field} />
          </FormControl>
          <FormDescription>
            Unit of measurement for maximum daily dose
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
)}
```

---

## Remaining Implementation Tasks

### 4. Backend Validation & Safety Checks

#### File: `convex/medication.ts`

**A. Add PRN Safety Check Function** (new function):
```typescript
async function checkPRNSafety(
  ctx: any,
  medicationId: Id<"medication">,
  residentId: string
): Promise<{ canAdminister: boolean; reason?: string }> {
  const medication = await ctx.db.get(medicationId);
  if (!medication) return { canAdminister: false, reason: "Medication not found" };

  // Only check for PRN medications
  if (medication.scheduleType !== "PRN (As Needed)") {
    return { canAdminister: true };
  }

  // Check if limits are set
  if (!medication.minIntervalHours && !medication.maxDailyDose) {
    return { canAdminister: true };
  }

  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

  // Get all PRN administrations in the last 24 hours
  const recentIntakes = await ctx.db
    .query("medicationIntake")
    .withIndex("byMedicationId", (q) => q.eq("medicationId", medicationId))
    .filter((q) =>
      q.and(
        q.eq(q.field("residentId"), residentId),
        q.eq(q.field("state"), "given"),
        q.gte(q.field("administratorAt"), twentyFourHoursAgo)
      )
    )
    .collect();

  // Check maximum daily dose
  if (medication.maxDailyDose && recentIntakes.length >= medication.maxDailyDose) {
    return {
      canAdminister: false,
      reason: `Maximum daily dose of ${medication.maxDailyDose} ${medication.maxDailyDoseUnit || "doses"} reached in last 24 hours`
    };
  }

  // Check minimum interval
  if (medication.minIntervalHours && recentIntakes.length > 0) {
    const lastIntake = recentIntakes[0];
    const minIntervalMs = medication.minIntervalHours * 60 * 60 * 1000;
    const timeSinceLastDose = now - (lastIntake.administratorAt || lastIntake.stateModifiedAt || 0);

    if (timeSinceLastDose < minIntervalMs) {
      const hoursRemaining = ((minIntervalMs - timeSinceLastDose) / (60 * 60 * 1000)).toFixed(1);
      return {
        canAdminister: false,
        reason: `Minimum ${medication.minIntervalHours} hour interval not met. Wait ${hoursRemaining} more hours`
      };
    }
  }

  return { canAdminister: true };
}
```

**B. Update `createAndAdministerMedicationIntake` to use PRN check:**
Add this before line 1780:
```typescript
// PRN Safety Check
const safetyCheck = await checkPRNSafety(ctx, args.medicationId, medication.residentId);
if (!safetyCheck.canAdminister) {
  throw new Error(safetyCheck.reason);
}
```

**C. Add Controlled Drug Witness Validation:**
Update the witness validation (around line 1760):
```typescript
const medication = await ctx.db.get(args.medicationId);
if (!medication) {
  throw new Error("Medication not found");
}

// Check if controlled drug requires second witness
if (medication.isControlledDrug && medication.controlledDrugSchedule) {
  if (!args.witnessedBy) {
    throw new Error("Controlled drugs require at least one witness");
  }
  // For Schedule 2 & 3, require second witness
  if (["2", "3"].includes(medication.controlledDrugSchedule)) {
    if (!args.secondWitness) {
      throw new Error(`Schedule ${medication.controlledDrugSchedule} controlled drugs require two witnesses`);
    }
  }
}
```

### 5. Update Medication Columns for Controlled Drugs

#### File: `components/medication/daily/columns.tsx`

**Add second witness field** (after line 240):
```typescript
{
  id: "secondWitness",
  header: "Second Witness",
  cell: ({ row }) => {
    const medication = row.original.medication;
    const secondWitnessId = row.original.secondWitnessByUserId;

    // Only show for controlled drugs
    if (!medication?.isControlledDrug) {
      return <span className="text-muted-foreground text-sm">N/A</span>;
    }

    if (secondWitnessId) {
      const witness = teamMembers.find((m) => m.userId === secondWitnessId);
      return (
        <p className="text-sm">
          {witness?.name || "Unknown"}
        </p>
      );
    }

    return (
      <Select
        disabled={row.original.state !== "given"}
        value={secondWitnessId}
        onValueChange={async (value) => {
          if (!setSecondWitness) return;
          try {
            await setSecondWitness({
              medicationIntakeId: row.original._id,
              secondWitnessUserId: value
            });
            toast.success("Second witness recorded");
          } catch (error) {
            toast.error("Failed to record second witness");
          }
        }}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select witness" />
        </SelectTrigger>
        <SelectContent>
          {teamMembers.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
},
```

**Add controlled drug badge to medication name** (update line 117):
```typescript
return (
  <div className="flex flex-col">
    <div className="flex items-center gap-2">
      <p className="font-medium">{medication.name}</p>
      {medication.isControlledDrug && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
          CD Schedule {medication.controlledDrugSchedule}
        </span>
      )}
    </div>
    <p className="text-xs text-muted-foreground">
      {strength} {strengthUnit} - {dosageForm}
    </p>
  </div>
);
```

### 6. Date Navigation

#### File: `app/(dashboard)/dashboard/residents/[id]/(pages)/medication/page.tsx`

**Add date state and navigation** (after line 35):
```typescript
const [selectedDate, setSelectedDate] = useState<Date>(new Date());

// Format selected date for query
const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
```

**Update query to use selected date** (line 45):
```typescript
const selectedDateIntakes = useQuery(
  api.medication.getMedicationIntakesByResidentAndDate,
  id && selectedDateStr
    ? {
        residentId: id,
        date: selectedDateStr
      }
    : "skip"
);
```

**Add date navigation UI** (before line 271):
```typescript
{/* Date Navigation */}
<div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
  >
    <ChevronLeft className="w-4 h-4 mr-1" />
    Previous Day
  </Button>

  <div className="flex items-center gap-4">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[240px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(selectedDate, "PPP")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          initialFocus
        />
      </PopoverContent>
    </Popover>

    <Button
      variant="outline"
      size="sm"
      onClick={() => setSelectedDate(new Date())}
    >
      Today
    </Button>
  </div>

  <Button
    variant="outline"
    size="sm"
    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
  >
    Next Day
    <ChevronRight className="w-4 h-4 ml-1" />
  </Button>
</div>
```

**Add required imports:**
```typescript
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, subDays, format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
```

---

## Testing Checklist

### Controlled Drugs:
- [ ] Create a controlled drug (Schedule 2)
- [ ] Verify it shows "CD Schedule 2" badge
- [ ] Try to mark as given without second witness (should fail for Schedule 2/3)
- [ ] Add second witness and verify it saves
- [ ] Check audit trail includes both witnesses

### PRN Safety:
- [ ] Create PRN medication with min interval 4 hours and max 4 doses/day
- [ ] Give first dose - should succeed
- [ ] Try to give second dose within 4 hours - should fail with error message
- [ ] Wait 4+ hours, give second dose - should succeed
- [ ] Give 3rd and 4th doses (respecting intervals)
- [ ] Try to give 5th dose in same 24 hours - should fail with "maximum daily dose" error
- [ ] After 24 hours from first dose, should allow new dose

### Date Navigation:
- [ ] Default should show today's medications
- [ ] Click "Previous Day" - should show yesterday
- [ ] Click "Next Day" - should show tomorrow
- [ ] Click date picker - select specific date, should load that date's medications
- [ ] Click "Today" - should return to current date

---

## Deployment Notes

1. **Database Migration**: These are schema additions (optional fields), so existing data remains valid
2. **Backward Compatibility**: All new fields are optional, system works without them
3. **Gradual Rollout**: Existing medications without CD/PRN flags continue to work normally
4. **Training Required**: Staff need training on:
   - What controlled drugs are
   - When to select second witness
   - How PRN limits prevent overdose
   - Using date navigation for prep/review

---

## Next Priority Fixes (After These)

1. **Allergy Checking** - Prevent administration if resident allergic
2. **Unsafe Stock Management** - Fix pop-out workflow
3. **Destruction Workflow** - For controlled drugs refused/dropped
4. **Mobile Optimization** - Tablet-friendly medication rounds
5. **Team Medication Round View** - All residents at once

---

**Status**: Schema and validation updates completed. UI and backend validation still needed.
**Priority**: CRITICAL - Required for legal compliance and patient safety
**Estimated Time**: 4-6 hours for remaining implementation
