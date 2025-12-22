# SaaS Admin Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create User Account
1. Go to `/signup` and create a new account with your desired SaaS admin email
2. Complete the basic signup process

### Step 2: Mark as SaaS Admin
**Option A: Via Convex Dashboard (Easiest)**
1. Open your Convex Dashboard
2. Go to **Functions** → `saasAdmin.seedSaasAdmin`
3. Click **Run** and enter:
   ```json
   {
     "email": "your-admin@email.com"
   }
   ```

**Option B: Via Code**
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
await client.mutation(api.saasAdmin.seedSaasAdmin, {
  email: "your-admin@email.com"
});
```

### Step 3: Login
1. Navigate to `/saas-admin/login`
2. Enter your SaaS admin credentials
3. Access the dashboard at `/saas-admin/dashboard`

## 📍 Key Routes

- **Login**: `/saas-admin/login`
- **Dashboard**: `/saas-admin/dashboard`
- **Two-Factor Auth**: `/saas-admin/login/two-factor`

## 🔑 Key Features

- ✅ View all organizations (care homes)
- ✅ View all users across all organizations
- ✅ View platform-wide statistics
- ✅ Manage SaaS admin status for other users
- ✅ Full access to all data (bypasses organization restrictions)

## 🔒 Security Notes

1. **Change Default Password**: Immediately after first login
2. **Enable 2FA**: Recommended for SaaS admin accounts
3. **Limit Access**: Only mark trusted users as SaaS admins

## 🆘 Troubleshooting

**"Access denied" on login?**
- Verify `isSaasAdmin: true` in Convex `users` table for your email

**"User not found" when seeding?**
- Make sure you've signed up first at `/signup`
- Check email spelling (case-sensitive)

**Function not found?**
- Run `npx convex deploy` to deploy latest functions

## 📚 Full Documentation

See `SAAS_ADMIN_SETUP.md` for complete documentation.

