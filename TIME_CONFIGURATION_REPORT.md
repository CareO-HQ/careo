# Time Configuration Analysis Report

## Executive Summary

This application uses a **hybrid time configuration** approach:

- **Server-side (Convex)**: Most critical timestamps are generated on the Convex server using `Date.now()`
- **Client-side (Browser)**: Date calculations and display formatting use browser's `new Date()`
- **System timestamps**: Convex automatically provides `_creationTime` system field for all documents
- **Timezone**: All operations are configured for UK timezone (`Europe/London`) with proper DST handling

## 1. Convex-Based (Server-Side) Time

### 1.1 System-Generated Timestamps

Convex automatically adds `_creationTime` to all documents when they are inserted:

**Location**: `convex/schema.ts` (system field, automatically added)

**Characteristics**:

- Generated server-side by Convex
- UTC-based timestamp (milliseconds since epoch)
- Immutable (cannot be changed after creation)
- Used extensively for sorting and versioning (e.g., care file forms)

### 1.2 Explicit Server-Side Timestamps

Many mutations explicitly use `Date.now()` which executes on the Convex server:

**Examples**:

1. **Food/Fluid Logs** (`convex/foodFluidLogs.ts:69-103`):
   - `timestamp: now` (where `now = Date.now()`)
   - `createdAt: now`
   - `scheduledDeletionAt: now + retentionPeriodYears * 365 * 24 * 60 * 60 * 1000`

2. **Medication Intakes** (`convex/medication.ts:160-161`):
   - `createdAt: Date.now()`
   - `updatedAt: Date.now()`

3. **Care Files** (various files in `convex/careFiles/`):
   - `submittedAt: Date.now()`
   - `pdfGeneratedAt: Date.now()`
   - `createdAt: Date.now()`

**Total occurrences**: 391 instances of `Date.now()` in Convex functions

### 1.3 Date String Generation (Server-Side)

Some Convex functions generate date strings using server time:

**Example** (`convex/foodFluidLogs.ts:70`):

```typescript
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
```

This uses the server's timezone to determine "today", which may differ from UK timezone.

## 2. Browser-Based (Client-Side) Time

### 2.1 Date Utilities

The application has dedicated date utilities that run in the browser:

**Location**: `lib/date-utils.ts`

**Key Functions**:

- `getUKTodayDate()`: Gets current date in UK timezone (uses browser's `new Date()`)
- `getUKNow()`: Gets current time in UK timezone
- `parseUKDate()`: Converts date strings to UK timezone

**Implementation** (`lib/date-utils.ts:20-30`):

```typescript
export function getUKTodayDate(): string {
  const now = new Date(); // Browser time
  return formatInTimeZone(now, UK_TIMEZONE, 'yyyy-MM-dd');
}

export function getUKNow(): Date {
  return toZonedTime(new Date(), UK_TIMEZONE); // Browser time converted to UK
}
```

### 2.2 Frontend Date Calculations

Many React components calculate dates using browser time:

**Example** (`app/(dashboard)/dashboard/residents/[id]/(pages)/daily-care/page.tsx:89-95`):

```typescript
const today = React.useMemo(() => {
  const now = new Date(); // Browser time
  const ukDateStr = now.toLocaleString('en-GB', { 
    timeZone: 'Europe/London', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  const [day, month, year] = ukDateStr.split('/');
  return `${year}-${month}-${day}`; // YYYY-MM-DD format
}, []);
```

**Total occurrences**: 224 instances of `new Date()` in app components

### 2.3 Shift Configuration

Shift calculations use browser time converted to UK timezone:

**Location**: `lib/config/shift-config.ts`

**Implementation** (`lib/config/shift-config.ts:42-58`):

```typescript
export function getCurrentShift(): ShiftType {
  // Get current time in UK timezone
  const ukTimeString = new Date().toLocaleString("en-GB", {
    timeZone: SHIFT_CONFIG.timezone, // "Europe/London"
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  // ... shift determination logic
}
```

## 3. Timezone Configuration

### 3.1 Primary Timezone

**Location**: `lib/date-utils.ts:14`

```typescript
export const UK_TIMEZONE = 'Europe/London';
```

**Purpose**: All care home operations use UK timezone to handle:

- GMT (winter): UTC+0
- BST (summer): UTC+1
- Automatic DST transitions

### 3.2 Shift Times

**Location**: `lib/config/shift-config.ts:11-26`

```typescript
export const SHIFT_CONFIG = {
  dayStart: 8,        // 8 AM UK time
  dayEnd: 20,         // 8 PM UK time
  timezone: "Europe/London",
  gracePeriodHours: 1,
  autoArchiveDayShiftHour: 21, // 9 PM UK time
} as const;
```

## 4. Potential Issues and Inconsistencies

### 4.1 Mixed Time Sources

**Issue**: The application mixes server-side and client-side time generation:

- **Server-side** (`Date.now()` in Convex): Uses Convex server's UTC time
- **Client-side** (`new Date()` in browser): Uses user's browser time, then converts to UK

**Impact**:

- If a user's browser clock is incorrect, client-side calculations will be wrong
- Server-side timestamps are always accurate (Convex server time)
- Date string generation in Convex may not respect UK timezone

### 4.2 Date String Generation in Convex

**Issue**: Some Convex functions generate date strings using server time:

```typescript
const today = new Date().toISOString().split("T")[0];
```

This uses the server's timezone, not UK timezone. If the Convex server is in a different timezone, "today" may be incorrect.

**Affected files**:

- `convex/foodFluidLogs.ts:70`
- `convex/foodFluidLogs.ts:173`
- Other files using similar patterns

### 4.3 Timezone Conversion Complexity

**Issue**: The application handles timezone conversion in multiple places:

- Browser-side: Uses `date-fns-tz` and `toLocaleString` with timezone
- Server-side: Uses `Date.now()` which is UTC, but date string generation may not convert properly

## 5. Recommendations

### 5.1 Standardize on Server-Side Time

**Recommendation**: Use Convex server time (`Date.now()`) for all critical timestamps, but convert to UK timezone when generating date strings.

**Implementation**: Create a Convex utility function:

```typescript
// convex/utils/dateUtils.ts
export function getUKTodayDateString(): string {
  const now = Date.now();
  // Convert UTC timestamp to UK timezone date string
  // Implementation using date-fns-tz or similar
}
```

### 5.2 Fix Date String Generation

**Recommendation**: Replace all instances of:

```typescript
const today = new Date().toISOString().split("T")[0];
```

With UK timezone-aware date string generation in Convex functions.

### 5.3 Document Time Source

**Recommendation**: Add comments to clarify:

- When timestamps are server-side (Convex)
- When timestamps are client-side (browser)
- When timezone conversion is applied

## 6. Summary Table

| Time Source | Location | Count | Timezone | Use Case |
|------------|----------|-------|----------|----------|
| `_creationTime` | Convex (system) | All documents | UTC | Document creation timestamp |
| `Date.now()` | Convex (server) | 391 instances | UTC | Explicit timestamps in mutations |
| `new Date()` | Browser (client) | 224 instances | Browser → UK | Date calculations, display, shift detection |
| Date strings | Mixed | Various | Mixed | Date-based queries (YYYY-MM-DD) |

## 7. Conclusion

The application uses a **hybrid approach**:

- **Critical timestamps**: Server-side (Convex) for accuracy and consistency
- **Date calculations**: Client-side (browser) with UK timezone conversion for user experience
- **System timestamps**: Automatic `_creationTime` from Convex

**Primary concern**: Date string generation in Convex functions may not respect UK timezone, potentially causing date boundary issues (e.g., "today" calculated incorrectly at midnight transitions).

**Recommendation**: Standardize date string generation to always use UK timezone, whether generated server-side or client-side.
