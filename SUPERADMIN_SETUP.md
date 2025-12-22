# Superadmin Automatic Setup

## Overview

The superadmin account is automatically initialized when a user with the email `jhonsonashik@gmail.com` signs up. The system will automatically:

1. Create the user account in Better Auth
2. Create the user record in Convex
3. Mark them as SaaS admin (`isSaasAdmin: true`)
4. Skip onboarding (`isOnboardingComplete: true`)

## Default Credentials

- **Email**: `jhonsonashik@gmail.com`
- **Password**: Set during signup (or use the script below)

## Setup Methods

### Method 1: Automatic (Recommended)

The superadmin account is automatically created when you sign up with `jhonsonashik@gmail.com`:

1. Go to `/signup`
2. Enter:
   - Email: `jhonsonashik@gmail.com`
   - Name: `Super Administrator` (or any name)
   - Password: Your desired password
3. The account will automatically be marked as SaaS admin
4. Login at `/saas-admin/login`

### Method 2: Using Script

Run the initialization script:

```bash
# Set password (optional, defaults to "SuperAdmin123!")
export SUPERADMIN_PASSWORD="YourSecurePassword123!"

# Run the script
npx tsx scripts/create-superadmin.ts
```

### Method 3: Manual via Convex Dashboard

1. Sign up at `/signup` with email `jhonsonashik@gmail.com`
2. Go to Convex Dashboard → Functions
3. Run `saasAdmin.seedSaasAdmin` with:
   ```json
   {
     "email": "jhonsonashik@gmail.com",
     "name": "Super Administrator"
   }
   ```

## How It Works

The `onCreateUser` hook in `convex/auth.ts` automatically checks if the email is `jhonsonashik@gmail.com` and:

- Sets `isSaasAdmin: true`
- Sets `isOnboardingComplete: true` (skips onboarding)

This means the account is ready to use immediately after signup.

## Security Notes

1. **Change Default Password**: After first login, change the password immediately
2. **Environment Variable**: For production, set `SUPERADMIN_PASSWORD` in your environment
3. **Email Verification**: Consider enabling email verification for production

## Troubleshooting

### "User already exists"
- The user account exists but may not be marked as SaaS admin
- Run `saasAdmin.seedSaasAdmin` mutation in Convex Dashboard
- Or use the script: `npx tsx scripts/create-superadmin.ts`

### "Access denied" on login
- Verify `isSaasAdmin: true` in Convex `users` table
- Check email spelling (case-sensitive)

### Redirect to regular dashboard
- The layout redirects non-SaaS admins
- Ensure the account has `isSaasAdmin: true` in Convex

## Login

After setup, login at:
- **URL**: `/saas-admin/login`
- **Email**: `jhonsonashik@gmail.com`
- **Password**: The password you set during signup



