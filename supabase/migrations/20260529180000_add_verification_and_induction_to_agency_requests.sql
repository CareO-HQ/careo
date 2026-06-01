-- ============================================================
-- CAREO: ADD VERIFICATION AND INDUCTION TO AGENCY REQUESTS
-- ============================================================
-- Migration: Add profile verification and induction details columns
-- Date: May 29, 2026

ALTER TABLE public.agency_requests
ADD COLUMN IF NOT EXISTS profile_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_verified_by TEXT,
ADD COLUMN IF NOT EXISTS induction_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS induction_given_by TEXT;
