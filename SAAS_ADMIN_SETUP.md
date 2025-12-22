# SaaS Admin Setup Guide

This guide explains how to set up and use the SaaS admin functionality in the care home management system.

## Overview

SaaS admins have full access to:
- View all organizations (care homes)
- View all users across all organizations
- View all residents
- Manage SaaS admin status for other users
- Access platform-wide statistics

## Initial Setup

### Step 1: Create the First SaaS Admin User

1. **Sign up a new user** via the regular signup flow at `/signup`
   - Use the email and password you want for the SaaS admin
   - Complete the basic signup process

2. **Mark the user as SaaS admin** using one of these methods:

   **Option A: Via Convex Dashboard (Recommended)**
   - Go to your Convex Dashboard
   - Navigate to Functions
   - Find `saasAdmin.seedSaasAdmin`
   - Run it with:
     ```json
     {
       "email": "admin@yourcompany.com",
       "name": "SaaS Administrator"
     }
     ```

   **Option B: Via API/Code**
   ```typescript
   import { ConvexHttpClient } from "convex/browser";
   import { api } from "./convex/_generated/api";
   
   const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
   
   await client.mutation(api.saasAdmin.seedSaasAdmin, {
     email: "admin@yourcompany.com",
     name: "SaaS Administrator"
   });
   ```

### Step 2: Login as SaaS Admin

1. Navigate to `/saas-admin/login`
2. Enter the SaaS admin email and password
3. Complete two-factor authentication if enabled
4. You'll be redirected to `/saas-admin/dashboard`

## SaaS Admin Features

### Dashboard (`/saas-admin/dashboard`)

The SaaS admin dashboard provides:
- **Platform Statistics**: Total organizations, users, SaaS admins, and residents
- **Organization List**: View all care homes with member and team counts
- **User Management**: View all users across all organizations
- **User Role Management**: Mark or remove SaaS admin status for users

### Key Functions

#### View All Organizations
```typescript
const organizations = await convex.query(api.saasAdmin.getAllOrganizations);
```

#### View All Users
```typescript
const users = await convex.query(api.saasAdmin.getAllUsers);
```

#### Mark User as SaaS Admin
```typescript
await convex.mutation(api.saasAdmin.markUserAsSaasAdmin, {
  userId: "user_id_here"
});
```

#### Remove SaaS Admin Status
```typescript
await convex.mutation(api.saasAdmin.removeSaasAdminStatus, {
  userId: "user_id_here"
});
```

## Security Considerations

1. **Initial Password**: Change the default password immediately after first login
2. **Limited Access**: Only mark trusted users as SaaS admins
3. **Audit Trail**: All SaaS admin actions should be logged (to be implemented)
4. **Two-Factor Authentication**: Enable 2FA for SaaS admin accounts

## Password Reset

SaaS admins can reset their password using Better Auth's password reset flow:
1. Go to `/reset-password`
2. Enter SaaS admin email
3. Follow the reset link sent to email
4. Set new password

## Environment Variables

Optional environment variables for initialization:

```bash
# SaaS Admin Configuration
SAAS_ADMIN_EMAIL=admin@yourcompany.com
SAAS_ADMIN_NAME="SaaS Administrator"
```

These can be used with the initialization script:
```bash
npx tsx scripts/init-saas-admin.ts
```

## Troubleshooting

### "Access denied" error on login
- Verify the user has `isSaasAdmin: true` in the Convex `users` table
- Check that the email matches exactly

### Cannot find seedSaasAdmin function
- Ensure you've deployed the latest Convex functions
- Run `npx convex deploy` if needed

### User not found when seeding
- Make sure the user has signed up first via `/signup`
- Verify the email matches exactly (case-sensitive)

## API Reference

### Queries

- `getCurrentUserSaasAdminStatus()` - Check if current user is SaaS admin
- `getAllOrganizations()` - Get all organizations (SaaS admin only)
- `getAllUsers()` - Get all users (SaaS admin only)
- `getSaasAdminStats()` - Get platform statistics (SaaS admin only)
- `checkSaasAdminExists()` - Check if any SaaS admin exists

### Mutations

- `seedSaasAdmin({ email, name? })` - Mark first user as SaaS admin
- `markUserAsSaasAdmin({ userId })` - Mark user as SaaS admin (requires SaaS admin)
- `removeSaasAdminStatus({ userId })` - Remove SaaS admin status (requires SaaS admin)

## Next Steps

After setting up the first SaaS admin:
1. Change the default password
2. Enable two-factor authentication
3. Review and mark additional trusted users as SaaS admins if needed
4. Set up monitoring and audit logging for SaaS admin actions

