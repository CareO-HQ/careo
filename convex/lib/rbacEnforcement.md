# RBAC Enforcement Guide

This guide shows how to add RBAC checks to existing queries and mutations using the new RBAC system.

## Import the RBAC Helpers

```typescript
import { resolveUser, ROLES, canAccessOrganization, canAccessUnit } from "../lib/rbac";
```

## Query Pattern

All queries should:
1. Resolve the user and their role
2. Enforce tenant isolation (organizationId)
3. Apply unit scoping for Nurse/Care Assistant

### Example: Get Residents Query

```typescript
export const getResidents = query({
  args: {
    organizationId: v.optional(v.string())
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Step 1: Resolve user with role and organization
    const { user, role, organizationId: userOrgId, activeUnitId } = await resolveUser(ctx);
    
    // Step 2: Determine target organization
    const targetOrgId = args.organizationId || userOrgId;
    
    // Step 3: SaaS Admin can read all, others must match their organization
    if (role !== ROLES.SAAS_ADMIN) {
      if (!targetOrgId || targetOrgId !== userOrgId) {
        throw new Error("Unauthorized: Cannot access different organization");
      }
    }
    
    // Step 4: Build query with organization filter
    let query = ctx.db
      .query("residents")
      .withIndex("byOrganizationId", (q) => q.eq("organizationId", targetOrgId));
    
    // Step 5: Apply unit filter for Nurse/Care Assistant
    if ((role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) && activeUnitId) {
      // Get unit to find teamId
      const unit = await ctx.db.get(activeUnitId);
      if (unit) {
        query = query.filter((q) => q.eq(q.field("teamId"), unit.teamId));
      } else {
        throw new Error("Active unit not found");
      }
    }
    
    // Step 6: Execute query
    return await query.collect();
  }
});
```

## Mutation Pattern

All mutations should:
1. Resolve the user and their role
2. Check specific permissions
3. Enforce tenant isolation
4. Validate organization/unit access

### Example: Create Resident Mutation

```typescript
export const createResident = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    organizationId: v.string(),
    teamId: v.string(),
    // ... other fields
  },
  returns: v.id("residents"),
  handler: async (ctx, args) => {
    // Step 1: Resolve user
    const { user, role, organizationId: userOrgId } = await resolveUser(ctx);
    
    // Step 2: Check permission - Care Assistants cannot create residents
    if (role === ROLES.CARE_ASSISTANT) {
      throw new Error("Unauthorized: Care assistants cannot create residents");
    }
    
    // Step 3: Enforce organization scope (unless SaaS Admin)
    if (role !== ROLES.SAAS_ADMIN && args.organizationId !== userOrgId) {
      throw new Error("Unauthorized: Cannot create resident in different organization");
    }
    
    // Step 4: Verify team/unit access if Nurse/Care Assistant
    if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
      // Find unit for this team
      const unit = await ctx.db
        .query("units")
        .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
        .first();
      
      if (!unit || user.activeUnitId !== unit._id) {
        throw new Error("Unauthorized: Cannot create resident in unit you're not assigned to");
      }
    }
    
    // Step 5: Create resident
    return await ctx.db.insert("residents", {
      ...args,
      createdBy: user._id.toString(), // Convert to string if needed
      createdAt: Date.now()
    });
  }
});
```

## Accessing Specific Resources

### Check Access to Organization

```typescript
const canAccess = await canAccessOrganization(ctx, organizationId);
if (!canAccess) {
  throw new Error("Unauthorized");
}
```

### Check Access to Unit

```typescript
const canAccess = await canAccessUnit(ctx, unitId);
if (!canAccess) {
  throw new Error("Unauthorized");
}
```

## Common Patterns

### Pattern 1: Organization-Scoped Query

```typescript
const { role, organizationId } = await resolveUser(ctx);

if (role === ROLES.SAAS_ADMIN) {
  // No filter - can see all
  return await ctx.db.query("tableName").collect();
} else {
  // Filter by organization
  return await ctx.db
    .query("tableName")
    .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
    .collect();
}
```

### Pattern 2: Unit-Scoped Query (Nurse/Care Assistant)

```typescript
const { role, organizationId, activeUnitId } = await resolveUser(ctx);

if (role === ROLES.SAAS_ADMIN || role === ROLES.OWNER || role === ROLES.MANAGER) {
  // Can see all in organization
  return await ctx.db
    .query("tableName")
    .withIndex("byOrganizationId", (q) => q.eq("organizationId", organizationId))
    .collect();
} else if (role === ROLES.NURSE || role === ROLES.CARE_ASSISTANT) {
  // Must filter by active unit
  if (!activeUnitId) {
    throw new Error("No active unit");
  }
  
  const unit = await ctx.db.get(activeUnitId);
  if (!unit) {
    throw new Error("Active unit not found");
  }
  
  return await ctx.db
    .query("tableName")
    .withIndex("byTeamId", (q) => q.eq("teamId", unit.teamId))
    .collect();
}
```

### Pattern 3: Role-Based Permission Check

```typescript
const { role } = await resolveUser(ctx);

// Only Owner and Manager can delete
if (role !== ROLES.OWNER && role !== ROLES.MANAGER && role !== ROLES.SAAS_ADMIN) {
  throw new Error("Unauthorized: Insufficient permissions");
}
```

## Migration Checklist

When updating existing queries/mutations:

- [ ] Import `resolveUser` and `ROLES` from `../lib/rbac`
- [ ] Replace manual user lookup with `resolveUser(ctx)`
- [ ] Add organization isolation check (unless SaaS Admin)
- [ ] Add unit scoping for Nurse/Care Assistant roles
- [ ] Add role-based permission checks for mutations
- [ ] Test with different roles (SaaS Admin, Owner, Manager, Nurse, Care Assistant)
- [ ] Verify tenant isolation (users can't access other organizations)
- [ ] Verify unit isolation (Nurse/Care Assistant can only see their active unit)

## Important Notes

1. **Never trust client role claims** - Always use `resolveUser()` to get the actual role
2. **SaaS Admin override** - Only applies to reads, writes still need explicit permission
3. **Tenant isolation** - All data must be scoped by organizationId (except SaaS Admin reads)
4. **Unit scoping** - Nurses and Care Assistants must have `activeUnitId` set
5. **Backward compatibility** - Keep existing checks during transition, add new RBAC checks alongside
