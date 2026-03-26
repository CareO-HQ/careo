-- ============================================
-- COPY THIS ENTIRE FILE AND RUN IT IN SUPABASE SQL EDITOR
-- ============================================

-- Step 1: Add 'topical' to the emar_sheet_type enum
ALTER TYPE emar_sheet_type ADD VALUE IF NOT EXISTS 'topical';

-- Step 2: Verify the change (you should see {medication,prn,topical})
SELECT enum_range(NULL::emar_sheet_type) as "Available eMAR Sheet Types";

-- ============================================
-- DONE! You can now use Topical eMAR
-- ============================================
