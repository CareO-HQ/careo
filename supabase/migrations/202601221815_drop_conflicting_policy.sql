-- ============================================
-- Fix Care Homes Insert Policy - Drop Conflicting Policy
-- ============================================
-- This migration fixes RLS errors by removing the conflicting "Owners can create care homes" policy
-- that was overriding the correct "Owners and SaaS admins can create care homes" policy.

-- Drop the conflicting policy (this is too strict and conflicts with the correct policy)
DROP POLICY IF EXISTS "Owners can create care homes" ON public.care_homes;

-- Verify the correct policy remains
-- The "Owners and SaaS admins can create care homes" policy should be the only INSERT policy
SELECT 
    policyname, 
    cmd, 
    qual, 
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'care_homes' AND cmd = 'INSERT';
