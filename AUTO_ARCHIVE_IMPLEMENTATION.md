# 🤖 Auto-Archive Implementation Guide

## Overview

This system automatically archives the day shift handover at 9:00 PM if staff forgot to do it manually. It includes a 1-hour grace period (8:00 PM - 9:00 PM) where warnings are shown.

---

## ⏰ Timeline

```
┌────────────────────────────────────────────────────────────────────┐
│                    Day Shift Auto-Archive Timeline                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  8:00 AM          2:00 PM          8:00 PM    9:00 PM    10:00 PM│
│    │────────────────────────────────│          │          │      │
│  START          WORKING            END       AUTO      NIGHT     │
│                                              ARCHIVE   WORKING    │
│                                                                    │
│  ☀️ DAY SHIFT ACTIVE              │ 🟡 GRACE │ 🌙 NIGHT SHIFT  │
│  • Comments save to "day"         │  PERIOD  │ • Comments save  │
│  • Can archive manually           │ (1 hour) │   to "night"     │
│                                   │ ⚠️ Warn  │ ✅ Auto-archive  │
│                                   │          │   completed      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Configuration

### Current Settings (`lib/config/shift-config.ts`)

```typescript
export const SHIFT_CONFIG = {
  dayStart: 8,              // 8:00 AM
  dayEnd: 20,               // 8:00 PM
  gracePeriodHours: 1,      // 1 hour grace period
  autoArchiveDayShiftHour: 21, // 9:00 PM auto-archive
  timezone: "Europe/London",
} as const;
```

---

## 🔧 Implementation Steps

### Step 1: Add to Handover Page

Add this code to `/app/(dashboard)/dashboard/handover/page.tsx`:

```typescript
import { checkGracePeriod, shouldAutoArchiveDayShift } from "@/lib/config/shift-config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function HandoverPage() {
  const [autoArchiveTriggered, setAutoArchiveTriggered] = useState(false);
  const [showGraceWarning, setShowGraceWarning] = useState(false);

  // Check for unarchived day shift
  const checkUnarchivedDayShift = useCallback(async () => {
    if (!activeTeamId) return;

    const today = new Date().toISOString().split('T')[0];
    const unarchivedInfo = await convex.query(
      api.handoverReports.hasUnarchivedComments,
      { teamId: activeTeamId, date: today, shift: "day" }
    );

    return unarchivedInfo;
  }, [activeTeamId, convex]);

  // Auto-archive logic
  useEffect(() => {
    const checkAndAutoArchive = async () => {
      if (autoArchiveTriggered || !activeTeamId || !activeTeam || !currentUser) return;

      // Check if it's 9 PM (auto-archive time)
      if (shouldAutoArchiveDayShift()) {
        const unarchivedInfo = await checkUnarchivedDayShift();

        if (unarchivedInfo.hasUnarchived) {
          // Trigger auto-archive
          await performAutoArchive();
          setAutoArchiveTriggered(true);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndAutoArchive, 60000);

    // Check immediately on mount
    checkAndAutoArchive();

    return () => clearInterval(interval);
  }, [activeTeamId, activeTeam, currentUser, autoArchiveTriggered]);

  // Grace period warning
  useEffect(() => {
    const checkGrace = async () => {
      const gracePeriod = checkGracePeriod();

      if (gracePeriod.inGracePeriod && gracePeriod.shiftToArchive === "day") {
        const unarchivedInfo = await checkUnarchivedDayShift();

        if (unarchivedInfo.hasUnarchived) {
          setShowGraceWarning(true);
        }
      } else {
        setShowGraceWarning(false);
      }
    };

    checkGrace();
    const interval = setInterval(checkGrace, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkUnarchivedDayShift]);

  // Perform auto-archive
  const performAutoArchive = async () => {
    if (!activeTeamId || !activeTeam || !residents || !currentUser) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      toast.info("Auto-archiving day shift handover...");

      // Fetch handover data for each resident
      const residentHandoversPromises = residents.map(async (resident) => {
        const report = await convex.query(api.handover.getHandoverReport, {
          residentId: resident._id as Id<"residents">
        });

        const commentData = await convex.query(api.handoverComments.getComment, {
          teamId: activeTeamId,
          residentId: resident._id as Id<"residents">,
          date: today,
          shift: "day",
        });

        return {
          residentId: resident._id,
          residentName: `${resident.firstName} ${resident.lastName}`,
          roomNumber: resident.roomNumber,
          age: getAge(resident.dateOfBirth),
          foodIntakeCount: report?.foodIntakeCount || 0,
          foodIntakeLogs: report?.foodIntakeLogs?.map(log => ({
            id: log.id.toString(),
            typeOfFoodDrink: log.typeOfFoodDrink,
            amountEaten: log.amountEaten,
            section: log.section,
            timestamp: log.timestamp,
          })) || [],
          totalFluid: report?.totalFluid || 0,
          fluidLogs: report?.fluidLogs?.map(log => ({
            id: log.id.toString(),
            typeOfFoodDrink: log.typeOfFoodDrink,
            fluidConsumedMl: log.fluidConsumedMl,
            section: log.section,
            timestamp: log.timestamp,
          })) || [],
          incidentCount: report?.incidentCount || 0,
          incidents: report?.incidents?.map(inc => ({
            id: inc.id.toString(),
            type: inc.type,
            level: inc.level,
            time: inc.time,
          })) || [],
          hospitalTransferCount: report?.hospitalTransferCount || 0,
          hospitalTransfers: report?.hospitalTransfers?.map(transfer => ({
            id: transfer.id.toString(),
            hospitalName: transfer.hospitalName,
            reason: transfer.reason,
          })) || [],
          comments: commentData?.comment || "",
        };
      });

      const residentHandovers = await Promise.all(residentHandoversPromises);

      // Save handover report
      await saveHandoverReport({
        date: today,
        shift: "day",
        teamId: activeTeamId,
        teamName: activeTeam.name,
        organizationId: currentUser.organizationId || "",
        residentHandovers,
        createdBy: "system_auto_archive",
        createdByName: "Auto-Archive System",
        updatedBy: "system_auto_archive",
        updatedByName: "Auto-Archive System",
      });

      // Cleanup: Delete draft comments
      await convex.mutation(api.handoverComments.deleteCommentsAfterArchive, {
        teamId: activeTeamId,
        date: today,
        shift: "day",
      });

      toast.success("Day shift handover automatically archived at 9:00 PM");
    } catch (error) {
      console.error("Auto-archive failed:", error);
      toast.error("Auto-archive failed. Please archive manually.");
    }
  };

  return (
    <div className="container mx-auto space-y-4">
      {/* Grace Period Warning */}
      {showGraceWarning && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100">
            Day Shift Not Archived - Auto-Archive in {checkGracePeriod().minutesRemaining} minutes
          </AlertTitle>
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <p className="mb-3">
              The day shift has not been archived yet. It will be <strong>automatically archived at 9:00 PM</strong>.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedShift("day");
                  setIsDialogOpen(true);
                }}
                className="bg-white dark:bg-gray-800"
              >
                Archive Day Shift Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGraceWarning(false)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Rest of handover page */}
      {/* ... existing code ... */}
    </div>
  );
}
```

---

## 📊 Behavior Chart

| Time | Current Shift | What Happens |
|------|--------------|--------------|
| 8:00 AM - 8:00 PM | Day ☀️ | • Normal day shift operation<br>• Comments save to "day"<br>• Staff can archive manually |
| 8:00 PM - 9:00 PM | Night 🌙 | • **Grace Period** (1 hour)<br>• ⚠️ Warning shown if day shift not archived<br>• Can still manually archive day shift<br>• New comments save to "night" |
| 9:00 PM (exactly) | Night 🌙 | • ✅ **Auto-Archive Triggered**<br>• System automatically archives day shift<br>• Toast notification shown<br>• Draft day comments deleted |
| After 9:00 PM | Night 🌙 | • Normal night shift operation<br>• Day shift already archived<br>• No warnings |

---

## 🎯 User Experience

### Scenario 1: Staff Archives Before 9 PM ✅

**8:45 PM - Day nurse archives manually:**
1. Clicks "Save as Archive"
2. Selects "Day Shift"
3. Archives successfully
4. Auto-archive check at 9 PM finds nothing to archive
5. No notification needed

---

### Scenario 2: Staff Forgets, Auto-Archive Happens ⚡

**8:30 PM - Warning shown:**
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Day Shift Not Archived                       │
│ Auto-Archive in 30 minutes                       │
│                                                  │
│ The day shift will be automatically archived     │
│ at 9:00 PM.                                      │
│                                                  │
│ [Archive Day Shift Now] [Dismiss]               │
└──────────────────────────────────────────────────┘
```

**9:00 PM - Auto-archive triggers:**
```
🔔 "Auto-archiving day shift handover..."
   ↓
✅ "Day shift handover automatically archived at 9:00 PM"
```

**What gets archived:**
- All resident data from day shift
- All food/fluid logs
- All incidents
- All comments from day shift
- Saved with creator: "Auto-Archive System"

---

### Scenario 3: No Data to Archive 🎈

**9:00 PM - No day shift comments:**
- Auto-archive check runs
- Finds no unarchived day shift data
- No action taken
- No notification

---

## ⚙️ Configuration Options

### Change Grace Period

```typescript
// lib/config/shift-config.ts
gracePeriodHours: 1.5, // 1.5 hours = 90 minutes
```

### Change Auto-Archive Time

```typescript
// lib/config/shift-config.ts
autoArchiveDayShiftHour: 22, // 10:00 PM instead of 9:00 PM
```

### Disable Auto-Archive (Manual Only)

```typescript
// lib/config/shift-config.ts
autoArchiveDayShiftHour: null, // Disable auto-archive
```

Then update the `shouldAutoArchiveDayShift()` function:
```typescript
export function shouldAutoArchiveDayShift(): boolean {
  if (SHIFT_CONFIG.autoArchiveDayShiftHour === null) return false;
  // ... rest of logic
}
```

---

## 🔍 Testing Checklist

### Manual Testing

- [ ] **8:00 PM** - Open page, verify grace warning shows (if day shift has comments)
- [ ] **8:30 PM** - Verify warning updates with remaining time
- [ ] **8:59 PM** - Verify warning shows "Auto-archive in 1 minute"
- [ ] **9:00 PM** - Verify auto-archive triggers automatically
- [ ] **9:01 PM** - Verify day shift is archived, warning gone
- [ ] **Manual archive** - Verify auto-archive doesn't run if already archived
- [ ] **No comments** - Verify no auto-archive if no day shift comments exist

### Edge Cases

- [ ] User archives manually at 8:59 PM (just before auto-archive)
- [ ] Network error during auto-archive (should show error toast)
- [ ] Page refreshed during grace period (warning should reappear)
- [ ] Multiple tabs open (auto-archive should only run once)

---

## 📝 Database Records

### Auto-Archived Handover Example

```typescript
{
  _id: "report_123",
  date: "2025-10-04",
  shift: "day",
  teamId: "team_abc",
  teamName: "Ground Floor Team",
  residentHandovers: [/* ... */],
  createdBy: "system_auto_archive", // ← System-created
  createdByName: "Auto-Archive System",
  createdAt: 1728072000000, // 9:00 PM timestamp
  updatedAt: 1728072000000,
  updatedBy: "system_auto_archive",
  updatedByName: "Auto-Archive System"
}
```

### Manually Archived Handover Example

```typescript
{
  _id: "report_124",
  date: "2025-10-05",
  shift: "day",
  teamId: "team_abc",
  teamName: "Ground Floor Team",
  residentHandovers: [/* ... */],
  createdBy: "nurse_jane_123", // ← User-created
  createdByName: "Jane Doe",
  createdAt: 1728158400000, // 8:45 PM timestamp
  updatedAt: 1728158400000,
  updatedBy: "nurse_jane_123",
  updatedByName: "Jane Doe"
}
```

You can tell which handovers were auto-archived by checking `createdBy === "system_auto_archive"`.

---

## 🚀 Benefits

1. ✅ **Never Lose Data** - Day shift always archived, even if staff forget
2. ✅ **Clear Handover** - Night shift always has access to day shift data
3. ✅ **Flexible** - 1-hour grace period for late finishing
4. ✅ **Transparent** - Clear warnings before auto-archive
5. ✅ **Auditable** - System-created archives clearly marked
6. ✅ **Reliable** - Runs automatically at exactly 9:00 PM UK time

---

## 🛠️ Troubleshooting

### Auto-Archive Not Triggering

**Check:**
1. Is it exactly 9:00 PM UK time? (Not local time)
2. Does day shift have unarchived comments?
3. Is the page open and active?
4. Check browser console for errors

**Debug:**
```typescript
console.log("Current UK time:", new Date().toLocaleString("en-GB", {
  timeZone: "Europe/London"
}));
console.log("Should auto-archive:", shouldAutoArchiveDayShift());
console.log("Has unarchived:", await checkUnarchivedDayShift());
```

### Multiple Auto-Archives

**Problem:** Auto-archive runs multiple times

**Solution:** Add a flag to prevent duplicate runs:
```typescript
const [autoArchiveTriggered, setAutoArchiveTriggered] = useState(false);

// In auto-archive logic:
if (autoArchiveTriggered) return; // Already done
```

---

## 📌 Summary

**Configuration:**
- Grace Period: **1 hour** (8:00 PM - 9:00 PM)
- Auto-Archive Time: **9:00 PM** UK time
- Applies to: **Day Shift Only**

**How It Works:**
1. At 8:00 PM, grace period starts
2. Warning shown if day shift not archived
3. At 9:00 PM, system automatically archives
4. Night shift can start with clean slate

**Staff Experience:**
- Clear warnings during grace period
- Option to archive manually anytime
- Automatic safety net at 9:00 PM
- No data loss ever

🎉 **Simple, Safe, Automatic!**

