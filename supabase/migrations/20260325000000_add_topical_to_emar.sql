-- ============================================
-- Add 'topical' to eMAR sheet type enum
-- Migration: 20260325000000_add_topical_to_emar.sql
-- Description: Adds 'topical' as a valid eMAR sheet type
-- ============================================

-- Add 'topical' to the emar_sheet_type enum
ALTER TYPE emar_sheet_type ADD VALUE IF NOT EXISTS 'topical';

-- Add comment explaining the types
COMMENT ON TYPE emar_sheet_type IS 'Types of eMAR sheets: medication (scheduled), prn (as needed), topical (topical applications)';
