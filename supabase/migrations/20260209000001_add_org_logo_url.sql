-- ============================================
-- SCHEMA FIX: ADD logo_url TO organizations
-- ============================================

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
