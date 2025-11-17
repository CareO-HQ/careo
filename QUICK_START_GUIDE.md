# ⚡ QUICK START GUIDE - Food & Fluid Security Implementation

**For the Development Team** | **Estimated Time: 4-5 hours** | **Updated: Nov 2, 2025**

---

## 🎯 GOAL

Transform the Food & Fluid module from **insecure** to **production-ready** for UK healthcare compliance.

---

## ✅ WHAT'S ALREADY DONE (No Action Needed)

- ✅ Auth helpers created (convex/lib/auth-helpers.ts)
- ✅ Schema updated with retention fields (convex/schema.ts)
- ✅ `createFoodFluidLog` mutation fully secured
- ✅ Test suite written (TESTS_AND_DEPLOYMENT.md)

---

## 🔨 WHAT YOU NEED TO DO (4-5 hours)

### Step 1: Install Dependencies (5 min)

```bash
npm install isomorphic-dompurify @sentry/nextjs
```

---

### Step 2: Apply Code Patches (3 hours)

Open SECURITY_IMPLEMENTATION.md and apply patches in this order:

#### 2.1 Secure Update Mutation (30 min)
- **File**: convex/foodFluidLogs.ts
- **Action**: Copy/paste PATCH 1 (lines ~119-157)
- **What it does**: Adds auth + sanitization to updateFoodFluidLog

#### 2.2 Secure Delete Mutation (20 min)
- **File**: convex/foodFluidLogs.ts
- **Action**: Copy/paste PATCH 2 (lines ~158-177)
- **What it does**: Adds auth + audit logging to deleteFoodFluidLog

#### 2.3 Secure All Query Functions (1 hour)
- **File**: convex/foodFluidLogs.ts
- **Action**: Apply PATCH 3 to 7 functions
- **What it does**: Prevents unauthorized data access

**Template for each query**:
```typescript
handler: async (ctx, args) => {
  // ADD THESE 2 LINES:
  const user = await getAuthenticatedUser(ctx);
  await canAccessResident(ctx, user._id, args.residentId);

  // ... rest of existing code
```

#### 2.4-2.8: Apply Remaining Patches
- PATCH 4: Retention (30 min)
- PATCH 5: Pagination (30 min)
- PATCH 6: Compliance file (15 min)
- PATCH 7: Cron jobs (15 min)
- PATCH 8: Frontend (15 min)

---

### Step 3: Deploy & Test (1 hour)

```bash
# 1. Deploy Convex schema
npx convex dev  # Test locally
npx convex deploy  # Deploy to production

# 2. Run tests
npm run test         # Unit tests (10/10 should pass)
npm run test:e2e     # E2E tests (10/10 should pass)

# 3. Build & deploy
npm run build
vercel --prod
```

---

## ✅ SUCCESS CRITERIA

You're done when:
- [ ] All 8 patches applied
- [ ] Tests pass (10/10)
- [ ] Build succeeds
- [ ] Manual verification complete

---

**Start here**: Open SECURITY_IMPLEMENTATION.md and apply PATCH 1

**Need help?** See IMPLEMENTATION_SUMMARY.md for detailed explanations
