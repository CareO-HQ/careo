-- Fix personal_profiles table columns to match versioning system requirements
ALTER TABLE public.personal_profiles RENAME COLUMN version TO version_number;

-- Add missing previous_version_id column
ALTER TABLE public.personal_profiles 
ADD COLUMN previous_version_id UUID REFERENCES public.personal_profiles(id) ON DELETE SET NULL;

-- Ensure status default is 'active' as per internal convention for submitted forms
ALTER TABLE public.personal_profiles ALTER COLUMN status SET DEFAULT 'active';
