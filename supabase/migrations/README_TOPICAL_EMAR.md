# Topical eMAR Migration Guide

## Required Database Migration

To enable the Topical eMAR functionality, you need to run the migration that adds 'topical' to the eMAR sheet type enum.

### Migration File
`20260325000000_add_topical_to_emar.sql`

### How to Apply

#### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20260325000000_add_topical_to_emar.sql`
4. Click "Run"

#### Option 2: Using Supabase CLI (if project is linked)
```bash
npx supabase db push
```

#### Option 3: Direct SQL Execution
Connect to your database and run:
```sql
ALTER TYPE emar_sheet_type ADD VALUE IF NOT EXISTS 'topical';
COMMENT ON TYPE emar_sheet_type IS 'Types of eMAR sheets: medication (scheduled), prn (as needed), topical (topical applications)';
```

### Verification

After running the migration, verify it worked:
```sql
SELECT enum_range(NULL::emar_sheet_type);
```

You should see: `{medication,prn,topical}`

### What This Enables

Once the migration is applied:
- Topical medications administered from "Today's Medications" will automatically appear in the Topical eMAR
- The `get_or_create_emar_sheet` RPC function will accept 'topical' as a valid sheet type
- Topical MAR sheets will be created for each month as needed

### Troubleshooting

If you see an error like:
```
invalid input value for enum emar_sheet_type: "topical"
```

This means the migration hasn't been applied yet. Follow the steps above to add 'topical' to the enum.
