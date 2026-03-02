-- Add assessment_data column to bedrail_consents to store full form state
ALTER TABLE public.bedrail_consents 
ADD COLUMN IF NOT EXISTS assessment_data JSONB;
