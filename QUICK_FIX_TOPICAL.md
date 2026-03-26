# Quick Fix: Enable Topical eMAR

## The Problem
You're seeing: `Failed to create eMAR sheet: invalid input value for enum emar_sheet_type: "topical"`

This means the database doesn't have 'topical' in the allowed values for eMAR sheet types yet.

## Quick Solution (Choose One)

### Option A: Supabase Dashboard (Recommended - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run This SQL**
   ```sql
   -- Add 'topical' to eMAR sheet types
   ALTER TYPE emar_sheet_type ADD VALUE IF NOT EXISTS 'topical';
   ```

3. **Click "Run"**

4. **Verify (Optional)**
   ```sql
   SELECT enum_range(NULL::emar_sheet_type);
   ```
   Should return: `{medication,prn,topical}`

5. **Done!** Refresh your app and try administering a topical medication again.

---

### Option B: Admin Page (If you prefer UI)

1. Navigate to: `http://localhost:3000/dashboard/admin/run-migration`
2. Click "Run Migration Automatically" (or follow manual instructions on the page)
3. Done!

---

## What This Does

- Adds 'topical' as a valid eMAR sheet type alongside 'medication' and 'prn'
- Enables the system to create Topical MAR sheets
- Allows topical medications to be recorded in the eMAR system

## After Running

Once the migration is complete:
- ✅ Administering topical medications will automatically create eMAR records
- ✅ Topical applications will appear in the Topical MAR tab
- ✅ No more "invalid input value" errors

## Verification Steps

1. Go to Today's Medications
2. Click "Administrate" on a topical medication
3. Select status (Applied/Refused/Missed)
4. Submit
5. Go to eMAR section → Topical MAR tab
6. You should see the administration in the calendar grid!

---

**Need Help?**
If you encounter any issues, check the browser console for error messages and let me know.
