-- Fix night_observation_consents schema to match submitAssessmentWithVersioning expectations
ALTER TABLE public.night_observation_consents 
RENAME COLUMN version TO version_number;

ALTER TABLE public.night_observation_consents
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.night_observation_consents(id) ON DELETE SET NULL;

-- Ensure status default is 'active' to match expected behavior
ALTER TABLE public.night_observation_consents 
ALTER COLUMN status SET DEFAULT 'active';

-- Update existing records if any
UPDATE public.night_observation_consents SET status = 'active' WHERE status = 'completed';
