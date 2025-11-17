# Error Handling & Monitoring Guide

## Overview

This guide documents the error handling system implemented in the CareO application to ensure production reliability, better debugging, and improved user experience.

---

## 🎯 Goals

1. **Graceful Degradation** - Never crash, always provide user-friendly error messages
2. **Comprehensive Logging** - Track all errors for debugging and monitoring
3. **Performance Monitoring** - Identify slow operations and bottlenecks
4. **Production Ready** - Meet healthcare compliance requirements

---

## 📁 Error Handling System

### Core Files

```
convex/lib/
├── errorHandling.ts      # Error handling utilities
└── authHelpers.ts        # Updated with error handling
```

---

## 🔧 Usage Patterns

### 1. Basic Mutation with Error Handling

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  withErrorHandling,
  ConvexError,
  ErrorType,
  validateRequired,
  measurePerformance
} from "./lib/errorHandling";

export const createProgressNote = mutation({
  args: {
    residentId: v.id("residents"),
    note: v.string(),
    type: v.string(),
  },
  handler: withErrorHandling("createProgressNote", async (ctx, args) => {
    // Validate required fields
    validateRequired(args.note, "Progress note");
    validateRequired(args.residentId, "Resident ID");

    // Measure performance
    return await measurePerformance("insertProgressNote", async () => {
      const noteId = await ctx.db.insert("progressNotes", {
        ...args,
        createdAt: new Date().toISOString(),
      });

      return { success: true, noteId };
    });
  })
});
```

### 2. Query with Error Handling

```typescript
import { query } from "./_generated/server";
import { withQueryErrorHandling } from "./lib/errorHandling";

export const getResident = query({
  args: { residentId: v.id("residents") },
  handler: withQueryErrorHandling("getResident", async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);

    if (!resident) {
      throw new ConvexError(
        "Resident not found",
        ErrorType.NOT_FOUND,
        404,
        { residentId: args.residentId }
      );
    }

    return resident;
  })
});
```

### 3. Custom Error Types

```typescript
// Authentication Error
throw new ConvexError(
  "You must be logged in",
  ErrorType.AUTHENTICATION,
  401
);

// Authorization Error
throw new ConvexError(
  "You don't have permission to delete this record",
  ErrorType.AUTHORIZATION,
  403,
  { userId: user._id, requiredRole: "admin" }
);

// Validation Error
throw new ConvexError(
  "Invalid email format",
  ErrorType.VALIDATION,
  400,
  { field: "email", value: email }
);

// Database Error
throw new ConvexError(
  "Failed to save resident data",
  ErrorType.DATABASE,
  500,
  { operation: "insert", table: "residents" }
);

// Rate Limit Error
throw new ConvexError(
  "Too many requests. Please wait.",
  ErrorType.RATE_LIMIT,
  429,
  { userId: user._id, limit: 100 }
);
```

### 4. Safe Database Operations

```typescript
import { safeDatabaseOperation } from "./lib/errorHandling";

// Wrap database calls for better error handling
const user = await safeDatabaseOperation(
  () => ctx.db
    .query("users")
    .withIndex("byEmail", (q) => q.eq("email", email))
    .first(),
  "Failed to fetch user from database"
);
```

### 5. Retry Mechanism

```typescript
import { retryOperation } from "./lib/errorHandling";

// Retry up to 3 times with exponential backoff
const result = await retryOperation(
  () => externalApiCall(),
  3,  // max retries
  1000 // initial delay in ms
);
```

### 6. Performance Monitoring

```typescript
import { measurePerformance } from "./lib/errorHandling";

// Logs slow operations (> 1 second)
const result = await measurePerformance("complexQuery", async () => {
  return await ctx.db
    .query("incidents")
    .withIndex("byOrganizationId", q => q.eq("organizationId", orgId))
    .collect();
});

// Output:
// ✓ complexQuery completed in 245.32ms
// or
// ⚠️ SLOW OPERATION: complexQuery took 1523.45ms
```

---

## 🎨 Error Types Reference

| Error Type | HTTP Code | Use Case | Example |
|------------|-----------|----------|---------|
| `AUTHENTICATION` | 401 | User not logged in | Missing auth token |
| `AUTHORIZATION` | 403 | User lacks permission | Member trying to delete |
| `VALIDATION` | 400 | Invalid input data | Empty required field |
| `NOT_FOUND` | 404 | Resource doesn't exist | Resident ID not found |
| `DATABASE` | 500 | Database operation failed | Query timeout |
| `RATE_LIMIT` | 429 | Too many requests | Exceeded 100/hour |
| `EXTERNAL_API` | 502 | Third-party service down | NHS API unavailable |
| `UNKNOWN` | 500 | Unexpected error | Catch-all |

---

## 📊 Performance Monitoring

### Slow Operation Thresholds

```typescript
// Automatically logs warnings for:
- Queries > 1 second
- Mutations > 1 second
- Database operations > 1 second
```

### Example Output

```
✓ getResident completed in 45.23ms
✓ createProgressNote completed in 123.45ms
⚠️ SLOW OPERATION: getIncidentsByOrganization took 1523.45ms
✗ updateResident failed after 234.56ms
```

---

## 🔍 Error Logging

### Console Logs (Development)

```json
=== CONVEX ERROR ===
{
  "timestamp": "2025-11-06T15:30:00.000Z",
  "operation": "createProgressNote",
  "message": "Progress note is required",
  "type": "VALIDATION_ERROR",
  "stack": "ConvexError: Progress note is required\n    at ...",
  "context": {
    "field": "note",
    "args": {
      "residentId": "k5775mr3247t1npjqyrs9pfy3h7s8we8",
      "note": "",
      "type": "daily"
    }
  }
}
===================
```

### Production Error Tracking (TODO)

```typescript
// In convex/lib/errorHandling.ts
export function logError(...) {
  // Current: console.error
  // TODO: Send to Sentry
  // Sentry.captureException(error, {
  //   extra: errorData,
  //   tags: {
  //     operation: operation,
  //     errorType: error.type
  //   }
  // });
}
```

---

## 🚀 Migration Guide

### Before (No Error Handling)

```typescript
export const updateResident = mutation({
  args: { id: v.id("residents"), data: v.object({}) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.data);
    return { success: true };
  }
});

// Problems:
// ❌ No validation
// ❌ Database errors crash the app
// ❌ No logging
// ❌ Generic error messages
// ❌ No performance tracking
```

### After (With Error Handling)

```typescript
export const updateResident = mutation({
  args: { id: v.id("residents"), data: v.object({}) },
  handler: withErrorHandling("updateResident", async (ctx, args) => {
    // Validate
    validateRequired(args.id, "Resident ID");

    // Check resident exists
    const resident = await ctx.db.get(args.id);
    if (!resident) {
      throw new ConvexError(
        "Resident not found",
        ErrorType.NOT_FOUND,
        404,
        { residentId: args.id }
      );
    }

    // Update with performance monitoring
    return await measurePerformance("updateResidentData", async () => {
      await safeDatabaseOperation(
        () => ctx.db.patch(args.id, args.data),
        "Failed to update resident data"
      );

      return { success: true, residentId: args.id };
    });
  })
});

// Benefits:
// ✅ Input validation
// ✅ Existence checks
// ✅ Safe database operations
// ✅ Performance monitoring
// ✅ User-friendly error messages
// ✅ Comprehensive logging
```

---

## 📋 Best Practices

### 1. Always Use Error Wrappers

```typescript
// ✅ Good
handler: withErrorHandling("myMutation", async (ctx, args) => {
  // Your code
})

// ❌ Bad
handler: async (ctx, args) => {
  // No error handling
}
```

### 2. Validate Early

```typescript
// ✅ Good - validate at the start
handler: withErrorHandling("create", async (ctx, args) => {
  validateRequired(args.name, "Name");
  validateRequired(args.email, "Email");

  // Continue with logic...
})

// ❌ Bad - discover errors midway
handler: withErrorHandling("create", async (ctx, args) => {
  await ctx.db.insert("users", { ...args });
  // Error occurs here if name is missing
})
```

### 3. Provide Context

```typescript
// ✅ Good - include context
throw new ConvexError(
  "Failed to create incident",
  ErrorType.DATABASE,
  500,
  {
    residentId: args.residentId,
    incidentType: args.type,
    userId: user._id
  }
);

// ❌ Bad - no context
throw new Error("Failed");
```

### 4. Use Appropriate Error Types

```typescript
// ✅ Good - specific error type
if (!user) {
  throw new ConvexError(
    "You must be logged in",
    ErrorType.AUTHENTICATION,
    401
  );
}

// ❌ Bad - wrong error type
if (!user) {
  throw new ConvexError(
    "You must be logged in",
    ErrorType.DATABASE,  // Wrong!
    500
  );
}
```

### 5. Measure Performance for Heavy Operations

```typescript
// ✅ Good - monitor heavy queries
const incidents = await measurePerformance("getAllIncidents", async () => {
  return await ctx.db
    .query("incidents")
    .withIndex("byOrganizationId", q => q.eq("organizationId", orgId))
    .collect();
});

// ❌ Bad - no monitoring
const incidents = await ctx.db
  .query("incidents")
  .collect();
```

---

## 🎯 Production Checklist

### Critical (Must Have)

- [x] Error handling utilities created
- [x] Error types defined
- [x] Performance monitoring added
- [ ] All mutations wrapped with error handling
- [ ] All queries wrapped with error handling
- [ ] Integration tests for error scenarios

### High Priority

- [ ] Sentry integration for error tracking
- [ ] Error monitoring dashboard
- [ ] Alert rules for critical errors
- [ ] Error rate metrics
- [ ] Performance degradation alerts

### Medium Priority

- [ ] Error analytics and trends
- [ ] Error budget tracking
- [ ] Automated error reports
- [ ] User impact analysis

---

## 📞 Next Steps

1. **Apply to all mutations** - Wrap all existing mutations with `withErrorHandling`
2. **Apply to all queries** - Wrap all existing queries with `withQueryErrorHandling`
3. **Add Sentry** - Integrate Sentry for production error tracking
4. **Set up monitoring** - Configure dashboards and alerts
5. **Test error scenarios** - Write tests for error handling paths
6. **Document for team** - Train team on error handling patterns

---

## 📚 Resources

- [Convex Error Handling Docs](https://docs.convex.dev/error-handling)
- [Sentry JavaScript SDK](https://docs.sentry.io/platforms/javascript/)
- [Production Monitoring Best Practices](https://sre.google/books/)

---

**Last Updated:** November 6, 2025
**Status:** ✅ Error handling system implemented
**Next:** Roll out to all Convex functions
