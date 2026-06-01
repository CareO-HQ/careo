-- Migration: Add INSERT policy for agency_staff table to allow users to create their own profiles
-- Date: May 29, 2026

CREATE POLICY "Agency staff insert own profile" ON public.agency_staff
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
