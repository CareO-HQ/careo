/**
 * One-time script to add 'topical' to emar_sheet_type enum
 *
 * Usage:
 * 1. Copy this SQL
 * 2. Go to Supabase Dashboard → SQL Editor
 * 3. Paste and run
 */

export const ADD_TOPICAL_ENUM_SQL = `
-- Add 'topical' to the emar_sheet_type enum
DO $$
BEGIN
  -- Check if 'topical' already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'topical'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'emar_sheet_type')
  ) THEN
    -- Add 'topical' to the enum
    ALTER TYPE emar_sheet_type ADD VALUE 'topical';
  END IF;
END $$;

-- Verify the change
SELECT enum_range(NULL::emar_sheet_type) as available_sheet_types;
`;

console.log('='.repeat(80));
console.log('COPY THE SQL BELOW AND RUN IT IN SUPABASE SQL EDITOR');
console.log('='.repeat(80));
console.log(ADD_TOPICAL_ENUM_SQL);
console.log('='.repeat(80));
