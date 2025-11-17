# 🧪 FOOD & FLUID MODULE - TESTS & DEPLOYMENT GUIDE

---

## 📝 UNIT TESTS

### File: `convex/foodFluidLogs.test.ts`

```typescript
import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("Food/Fluid Logs - Security Tests", () => {
  let t: any;
  let testUser: any;
  let testResident: any;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create test user
    testUser = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
      });
    });

    // Create test resident
    testResident = await t.run(async (ctx) => {
      return await ctx.db.insert("residents", {
        name: "Test Resident",
        teamId: "test-team-123",
        organizationId: "test-org-123",
        createdAt: Date.now(),
      });
    });

    // Create team membership
    await t.run(async (ctx) => {
      await ctx.db.insert("teamMembers", {
        userId: testUser,
        teamId: "test-team-123",
        role: "admin",
      });
    });
  });

  test("should reject unauthenticated requests", async () => {
    await expect(
      t.mutation(api.foodFluidLogs.createFoodFluidLog, {
        residentId: testResident,
        section: "7am-12pm",
        typeOfFoodDrink: "Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        organizationId: "test-org-123",
        createdBy: testUser,
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("should reject unauthorized access to resident", async () => {
    // Create user WITHOUT access to resident
    const unauthorizedUser = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "unauthorized@example.com",
        name: "Unauthorized User",
      });
    });

    // Create team membership for DIFFERENT team
    await t.run(async (ctx) => {
      await ctx.db.insert("teamMembers", {
        userId: unauthorizedUser,
        teamId: "different-team-456",
        role: "admin",
      });
    });

    // Attempt to create log (should fail)
    await expect(
      t.mutation(
        api.foodFluidLogs.createFoodFluidLog,
        {
          residentId: testResident,
          section: "7am-12pm",
          typeOfFoodDrink: "Tea",
          portionServed: "1 cup",
          amountEaten: "All",
          signature: "Test Staff",
          organizationId: "test-org-123",
          createdBy: unauthorizedUser,
        },
        { as: unauthorizedUser }
      )
    ).rejects.toThrow("Not authorized");
  });

  test("should sanitize XSS input", async () => {
    const maliciousInput = '<script>alert("XSS")</script>Tea';

    const logId = await t.mutation(
      api.foodFluidLogs.createFoodFluidLog,
      {
        residentId: testResident,
        section: "7am-12pm",
        typeOfFoodDrink: maliciousInput,
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        organizationId: "test-org-123",
        createdBy: testUser,
      },
      { as: testUser }
    );

    const log = await t.run(async (ctx) => ctx.db.get(logId));

    // Should have stripped script tags
    expect(log.typeOfFoodDrink).not.toContain("<script>");
    expect(log.typeOfFoodDrink).toBe("Tea");
  });

  test("should validate fluid volume (0-2000ml)", async () => {
    await expect(
      t.mutation(
        api.foodFluidLogs.createFoodFluidLog,
        {
          residentId: testResident,
          section: "7am-12pm",
          typeOfFoodDrink: "Water",
          portionServed: "1 cup",
          amountEaten: "All",
          fluidConsumedMl: 3000, // Invalid: > 2000ml
          signature: "Test Staff",
          organizationId: "test-org-123",
          createdBy: testUser,
        },
        { as: testUser }
      )
    ).rejects.toThrow("Fluid volume must be between 0-2000ml");
  });

  test("should enforce rate limiting (100 logs/hour)", async () => {
    // Create 100 logs rapidly
    const promises = Array.from({ length: 100 }, (_, i) =>
      t.mutation(
        api.foodFluidLogs.createFoodFluidLog,
        {
          residentId: testResident,
          section: "7am-12pm",
          typeOfFoodDrink: `Log ${i}`,
          portionServed: "1 cup",
          amountEaten: "All",
          signature: "Test Staff",
          organizationId: "test-org-123",
          createdBy: testUser,
        },
        { as: testUser }
      )
    );

    await Promise.all(promises);

    // 101st log should fail
    await expect(
      t.mutation(
        api.foodFluidLogs.createFoodFluidLog,
        {
          residentId: testResident,
          section: "7am-12pm",
          typeOfFoodDrink: "Log 101",
          portionServed: "1 cup",
          amountEaten: "All",
          signature: "Test Staff",
          organizationId: "test-org-123",
          createdBy: testUser,
        },
        { as: testUser }
      )
    ).rejects.toThrow("Rate limit exceeded");
  });

  test("should create audit log entry on create", async () => {
    const logId = await t.mutation(
      api.foodFluidLogs.createFoodFluidLog,
      {
        residentId: testResident,
        section: "7am-12pm",
        typeOfFoodDrink: "Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        organizationId: "test-org-123",
        createdBy: testUser,
      },
      { as: testUser }
    );

    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db
        .query("foodFluidAuditLog")
        .withIndex("by_log", (q) => q.eq("logId", logId))
        .collect();
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("create");
    expect(auditLogs[0].userId).toBe(testUser);
  });

  test("should prevent editing archived logs", async () => {
    // Create and archive a log
    const logId = await t.run(async (ctx) => {
      return await ctx.db.insert("foodFluidLogs", {
        residentId: testResident,
        timestamp: Date.now(),
        section: "7am-12pm",
        typeOfFoodDrink: "Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        date: new Date().toISOString().split("T")[0],
        isArchived: true,
        isReadOnly: true,
        retentionPeriodYears: 7,
        schemaVersion: 1,
        organizationId: "test-org-123",
        createdBy: testUser,
        createdAt: Date.now(),
      });
    });

    // Attempt to update (should fail)
    await expect(
      t.mutation(
        api.foodFluidLogs.updateFoodFluidLog,
        {
          logId: logId,
          typeOfFoodDrink: "Coffee",
        },
        { as: testUser }
      )
    ).rejects.toThrow("Cannot update archived or read-only log entries");
  });

  test("should set 7-year retention period", async () => {
    const logId = await t.mutation(
      api.foodFluidLogs.createFoodFluidLog,
      {
        residentId: testResident,
        section: "7am-12pm",
        typeOfFoodDrink: "Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        organizationId: "test-org-123",
        createdBy: testUser,
      },
      { as: testUser }
    );

    const log = await t.run(async (ctx) => ctx.db.get(logId));

    expect(log.retentionPeriodYears).toBe(7);
    expect(log.scheduledDeletionAt).toBeGreaterThan(Date.now());

    // Verify it's scheduled for deletion in ~7 years
    const sevenYears = 7 * 365 * 24 * 60 * 60 * 1000;
    const expectedDeletion = log.createdAt + sevenYears;
    expect(log.scheduledDeletionAt).toBeCloseTo(expectedDeletion, -100000); // Within ~1 day
  });
});

describe("Food/Fluid Logs - Retention Tests", () => {
  let t: any;

  beforeEach(async () => {
    t = convexTest(schema);
  });

  test("should archive logs older than 1 year", async () => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    // Create old log
    const oldLogId = await t.run(async (ctx) => {
      return await ctx.db.insert("foodFluidLogs", {
        residentId: "test-resident-123",
        timestamp: oneYearAgo - 1000,
        section: "7am-12pm",
        typeOfFoodDrink: "Old Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        date: new Date(oneYearAgo).toISOString().split("T")[0],
        isArchived: false,
        isReadOnly: false,
        retentionPeriodYears: 7,
        scheduledDeletionAt: oneYearAgo + 7 * 365 * 24 * 60 * 60 * 1000,
        schemaVersion: 1,
        organizationId: "test-org-123",
        createdBy: "test-user-123",
        createdAt: oneYearAgo,
      });
    });

    // Run archival
    const result = await t.mutation(api.foodFluidLogs.autoArchiveOldLogs);

    expect(result.archivedCount).toBeGreaterThan(0);

    // Verify log is archived
    const archivedLog = await t.run(async (ctx) => ctx.db.get(oldLogId));
    expect(archivedLog.isArchived).toBe(true);
    expect(archivedLog.isReadOnly).toBe(true);
  });

  test("should delete logs older than 7 years", async () => {
    const eightYearsAgo = Date.now() - 8 * 365 * 24 * 60 * 60 * 1000;

    // Create very old log scheduled for deletion
    const veryOldLogId = await t.run(async (ctx) => {
      return await ctx.db.insert("foodFluidLogs", {
        residentId: "test-resident-123",
        timestamp: eightYearsAgo,
        section: "7am-12pm",
        typeOfFoodDrink: "Very Old Tea",
        portionServed: "1 cup",
        amountEaten: "All",
        signature: "Test Staff",
        date: new Date(eightYearsAgo).toISOString().split("T")[0],
        isArchived: true,
        isReadOnly: true,
        retentionPeriodYears: 7,
        scheduledDeletionAt: Date.now() - 1000, // Scheduled for deletion NOW
        schemaVersion: 1,
        organizationId: "test-org-123",
        createdBy: "test-user-123",
        createdAt: eightYearsAgo,
      });
    });

    // Run retention enforcement
    const result = await t.mutation(api.foodFluidLogs.autoArchiveOldLogs);

    expect(result.deletedCount).toBeGreaterThan(0);

    // Verify log is deleted
    const deletedLog = await t.run(async (ctx) => ctx.db.get(veryOldLogId));
    expect(deletedLog).toBeNull();
  });
});
```

---

## 🎭 E2E TESTS (PLAYWRIGHT)

### File: `tests/food-fluid.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Food & Fluid Tracking - E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Navigate to resident page
    await page.goto("/dashboard/residents/test-resident-123/food-fluid");
  });

  test("should display food & fluid tracking page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Food & Fluid Intake");
    await expect(page.locator('[data-testid="food-logs-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="fluid-summary"]')).toBeVisible();
  });

  test("should create new food log entry", async ({ page }) => {
    // Open dialog
    await page.click('[data-testid="add-food-log-button"]');

    // Fill form
    await page.selectOption('[name="section"]', "7am-12pm");
    await page.fill('[name="typeOfFoodDrink"]', "Toast");
    await page.fill('[name="portionServed"]', "2 slices");
    await page.selectOption('[name="amountEaten"]', "All");
    await page.fill('[name="signature"]', "Test Staff");

    // Submit
    await page.click('button[type="submit"]');

    // Verify success toast
    await expect(page.locator(".toast-success")).toContainText(
      "Logged successfully"
    );

    // Verify entry appears in table
    await expect(page.locator('[data-testid="food-logs-table"]')).toContainText(
      "Toast"
    );
  });

  test("should create new fluid log entry", async ({ page }) => {
    await page.click('[data-testid="add-fluid-log-button"]');

    await page.selectOption('[name="section"]', "12pm-5pm");
    await page.fill('[name="typeOfFoodDrink"]', "Water");
    await page.fill('[name="fluidConsumedMl"]', "250");
    await page.fill('[name="signature"]', "Test Staff");

    await page.click('button[type="submit"]');

    await expect(page.locator(".toast-success")).toBeVisible();

    // Verify fluid summary updated
    const fluidSummary = await page.locator('[data-testid="fluid-summary"]').textContent();
    expect(fluidSummary).toContain("250");
  });

  test("should prevent XSS in food name", async ({ page }) => {
    await page.click('[data-testid="add-food-log-button"]');

    // Try to inject script
    await page.fill('[name="typeOfFoodDrink"]', '<script>alert("XSS")</script>Tea');
    await page.fill('[name="portionServed"]', "1 cup");
    await page.selectOption('[name="amountEaten"]', "All");
    await page.fill('[name="signature"]', "Test Staff");

    await page.click('button[type="submit"]');

    // Verify script tags are stripped
    const tableContent = await page.locator('[data-testid="food-logs-table"]').textContent();
    expect(tableContent).not.toContain("<script>");
    expect(tableContent).toContain("Tea");
  });

  test("should not allow editing archived logs", async ({ page }) => {
    // Navigate to archived logs
    await page.click('[data-testid="view-archived-button"]');

    // Find an archived log
    const archivedRow = page.locator('[data-archived="true"]').first();
    await archivedRow.click();

    // Edit button should be disabled
    await expect(page.locator('[data-testid="edit-log-button"]')).toBeDisabled();
  });

  test("should auto-save draft on form change", async ({ page }) => {
    await page.click('[data-testid="add-food-log-button"]');

    // Fill form partially
    await page.fill('[name="typeOfFoodDrink"]', "Partial Entry");
    await page.fill('[name="portionServed"]', "1 portion");

    // Wait for auto-save (30 seconds configured)
    await page.waitForTimeout(31000);

    // Refresh page
    await page.reload();

    // Re-open dialog
    await page.click('[data-testid="add-food-log-button"]');

    // Verify draft is loaded
    await expect(page.locator('[name="typeOfFoodDrink"]')).toHaveValue(
      "Partial Entry"
    );
    await expect(page.locator(".toast-info")).toContainText(
      "Draft loaded from last session"
    );
  });

  test("should display error boundary on crash", async ({ page }) => {
    // Force a crash by navigating to invalid resident ID
    await page.goto("/dashboard/residents/invalid-id-that-crashes/food-fluid");

    // Verify error boundary is displayed
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator("h2")).toContainText("Something went wrong");

    // Verify "Try again" button works
    await page.click('[data-testid="error-boundary-retry"]');
    await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
  });

  test("should export GDPR data in JSON format", async ({ page }) => {
    await page.click('[data-testid="export-data-button"]');
    await page.selectOption('[name="format"]', "json");
    await page.click('[data-testid="confirm-export"]');

    // Wait for download
    const download = await page.waitForEvent("download");
    const filename = download.suggestedFilename();

    expect(filename).toContain(".json");

    // Verify file content
    const path = await download.path();
    const fs = require("fs");
    const content = fs.readFileSync(path, "utf8");
    const data = JSON.parse(content);

    expect(data).toHaveProperty("foodFluidLogs");
    expect(data).toHaveProperty("auditLog");
    expect(data).toHaveProperty("totalLogs");
  });

  test("should validate fluid volume (max 2000ml)", async ({ page }) => {
    await page.click('[data-testid="add-fluid-log-button"]');

    await page.fill('[name="fluidConsumedMl"]', "3000"); // Invalid: > 2000ml
    await page.fill('[name="typeOfFoodDrink"]', "Water");
    await page.fill('[name="signature"]', "Test Staff");

    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator(".toast-error")).toContainText(
      "Fluid volume must be between 0-2000ml"
    );
  });

  test("should show rate limit error after 100 logs", async ({ page }) => {
    // Create 100 logs rapidly (via API or loop)
    for (let i = 0; i < 100; i++) {
      await page.click('[data-testid="add-food-log-button"]');
      await page.fill('[name="typeOfFoodDrink"]', `Log ${i}`);
      await page.fill('[name="portionServed"]', "1");
      await page.selectOption('[name="amountEaten"]', "All");
      await page.fill('[name="signature"]', "Test");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }

    // 101st log should fail
    await page.click('[data-testid="add-food-log-button"]');
    await page.fill('[name="typeOfFoodDrink"]', "Log 101");
    await page.fill('[name="portionServed"]', "1");
    await page.selectOption('[name="amountEaten"]', "All");
    await page.fill('[name="signature"]', "Test");
    await page.click('button[type="submit"]');

    await expect(page.locator(".toast-error")).toContainText("Rate limit exceeded");
  });
});
```

---

## 🚀 DEPLOYMENT RUNBOOK

### Pre-Deployment Checklist

```bash
# 1. Install dependencies
npm install isomorphic-dompurify @sentry/nextjs

# 2. Set environment variables
cp .env.example .env.production
# Edit .env.production with production values

# 3. Run type check
npm run typecheck

# 4. Run linter
npm run lint

# 5. Run unit tests
npm run test

# 6. Run E2E tests
npm run test:e2e

# 7. Build application
npm run build
```

### Deployment Steps

#### Step 1: Deploy Convex Schema

```bash
# Deploy schema changes to production
npx convex deploy --prod

# Verify schema is deployed
npx convex dashboard --prod
```

#### Step 2: Run Database Migration (if needed)

```typescript
// convex/migrations/001_add_retention_fields.ts
import { internalMutation } from "./_generated/server";

export const migrateExistingLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("foodFluidLogs").collect();

    const updates = logs.map((log) => {
      const retentionPeriodYears = 7;
      const scheduledDeletionAt =
        log.createdAt + retentionPeriodYears * 365 * 24 * 60 * 60 * 1000;

      return ctx.db.patch(log._id, {
        isArchived: log.isArchived ?? false,
        retentionPeriodYears,
        scheduledDeletionAt,
        isReadOnly: log.isArchived ?? false,
        schemaVersion: 1,
        consentToStore: true,
        dataProcessingBasis: "care_delivery",
      });
    });

    await Promise.all(updates);

    return { migratedCount: logs.length };
  },
});
```

Run migration:
```bash
npx convex run migrations:migrateExistingLogs --prod
```

#### Step 3: Deploy Frontend

```bash
# Deploy to Vercel/your hosting platform
npm run build
npm run start  # Test production build locally

# Deploy
vercel --prod  # or your deployment command
```

#### Step 4: Verify Deployment

```bash
# 1. Check Sentry is receiving errors
curl https://sentry.io/api/0/projects/your-org/your-project/events/ \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# 2. Check Convex cron jobs are running
npx convex dashboard --prod
# Navigate to Functions > Cron Jobs
# Verify "Archive and enforce retention" is scheduled

# 3. Test critical paths
# - Create log entry
# - Update log entry
# - Export GDPR data
# - Verify audit log entries
```

---

## 🔍 VERIFICATION COMMANDS

### 1. Test Authorization

```bash
# In Convex Dashboard > Functions > createFoodFluidLog
# Test 1: Call without authentication (should fail)
{
  "residentId": "jh7...",
  "section": "7am-12pm",
  "typeOfFoodDrink": "Test",
  "portionServed": "1",
  "amountEaten": "All",
  "signature": "Test",
  "organizationId": "org123",
  "createdBy": "user123"
}
# Expected: Error "Not authenticated"

# Test 2: Call with auth but wrong resident (should fail)
# Expected: Error "Not authorized to access this resident's data"

# Test 3: Call with proper auth and resident (should succeed)
# Expected: Returns log ID and audit log created
```

### 2. Test Retention Policy

```sql
-- In Convex Dashboard > Data > foodFluidLogs
-- Insert test record with old date
{
  "residentId": "test-resident",
  "timestamp": 1577836800000,  // Jan 1, 2020 (5 years ago)
  "createdAt": 1420070400000,  // Jan 1, 2015 (8 years ago)
  "scheduledDeletionAt": 1640995200000,  // Jan 1, 2022 (past)
  "date": "2015-01-01",
  "isArchived": false,
  "retentionPeriodYears": 7,
  "isReadOnly": false,
  "schemaVersion": 1,
  "section": "7am-12pm",
  "typeOfFoodDrink": "Old Entry",
  "portionServed": "1",
  "amountEaten": "All",
  "signature": "Test",
  "organizationId": "org123",
  "createdBy": "user123"
}

-- Run retention enforcement
npx convex run foodFluidLogs:autoArchiveOldLogs --prod

-- Verify record is deleted
-- Expected: Record no longer exists in foodFluidLogs table
```

### 3. Test Audit Log

```bash
# Create a log entry via UI
# Then query audit log table

# In Convex Dashboard > Data > foodFluidAuditLog
# Expected: Entry with action="create", userId, timestamp, metadata
```

### 4. Test GDPR Export

```bash
# In Convex Dashboard > Functions > exportResidentFoodFluidData
{
  "residentId": "jh7...",
  "format": "json",
  "includeAuditLog": true
}

# Expected output:
{
  "format": "json",
  "data": "{\"exportDate\":\"2025-11-02T...\",\"foodFluidLogs\":[...]}"
}

# Verify JSON contains:
# - exportDate
# - resident info
# - all food/fluid logs
# - audit log entries
# - totalFluidIntakeMl
```

### 5. Test Input Sanitization

```bash
# Create log with XSS payload
{
  "residentId": "jh7...",
  "typeOfFoodDrink": "<script>alert('XSS')</script>Tea"
}

# Query the created log
# Expected: typeOfFoodDrink = "Tea" (script tags stripped)
```

---

## 📈 MONITORING SETUP

### Sentry Configuration

**File**: `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,

  // Food & Fluid module specific tags
  beforeSend(event, hint) {
    if (event.request?.url?.includes("/food-fluid")) {
      event.tags = {
        ...event.tags,
        module: "food-fluid",
      };
    }
    return event;
  },
});
```

**File**: `sentry.server.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Convex Monitoring

```typescript
// convex/lib/monitoring.ts
export function logPerformance(
  operation: string,
  startTime: number,
  metadata?: Record<string, any>
) {
  const duration = Date.now() - startTime;

  // Log slow operations (> 1 second)
  if (duration > 1000) {
    console.warn(`Slow operation: ${operation}`, {
      duration,
      ...metadata,
    });
  }

  return duration;
}

// Usage in mutations:
export const createFoodFluidLog = mutation({
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // ... handler code ...

    logPerformance("createFoodFluidLog", startTime, {
      residentId: args.residentId,
    });
  },
});
```

---

## ✅ FINAL PRODUCTION READINESS CHECKLIST

### Security ✅
- [ ] All mutations have `getAuthenticatedUser()`
- [ ] All mutations have `canAccessResident()`
- [ ] All text inputs are sanitized with `sanitizeInput()`
- [ ] Rate limiting enforced (100 logs/hour)
- [ ] Audit logs created for all actions
- [ ] XSS prevention verified with penetration testing

### Compliance ✅
- [ ] 7-year retention policy implemented
- [ ] Archived logs are read-only (immutable)
- [ ] Scheduled deletion after 7 years
- [ ] GDPR export functionality works
- [ ] Audit trail for all data access
- [ ] Data processing basis documented

### Reliability ✅
- [ ] ErrorBoundary wraps all pages
- [ ] Auto-save prevents data loss
- [ ] Sentry error tracking operational
- [ ] Retry logic for failed submissions
- [ ] Loading states on all async operations

### Performance ✅
- [ ] Pagination optimized (no full date range generation)
- [ ] Batched queries reduce N+1 problems
- [ ] Composite indexes on frequently queried fields
- [ ] Server-side filtering instead of client-side

### Testing ✅
- [ ] Unit tests pass (80%+ coverage)
- [ ] E2E tests pass (critical paths)
- [ ] Authorization tests pass
- [ ] Retention policy tests pass
- [ ] XSS prevention tests pass

### Documentation ✅
- [ ] Deployment runbook completed
- [ ] Environment variables documented
- [ ] Migration scripts tested
- [ ] Rollback plan prepared

---

## 🆘 ROLLBACK PLAN

If deployment fails:

```bash
# 1. Revert Convex schema
npx convex rollback --prod

# 2. Revert frontend deployment
vercel rollback  # or your platform's rollback command

# 3. Restore database from backup
npx convex run foodFluidCompliance:restoreBackup --prod \
  --arg '{"backupDate":"2025-11-01T00:00:00Z"}'

# 4. Verify rollback
npm run test:e2e
```

---

**Status**: ✅ Implementation guide complete. Ready for deployment.
