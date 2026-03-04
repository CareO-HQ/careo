-- Add versioning and standardized columns to restraints_consents
ALTER TABLE public.restraints_consents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.restraints_consents(id),
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN,
ADD COLUMN IF NOT EXISTS representative_name TEXT;

-- Add index for versioning and filtering
CREATE INDEX IF NOT EXISTS idx_restraints_consents_status ON public.restraints_consents(status);
CREATE INDEX IF NOT EXISTS idx_restraints_consents_previous_version_id ON public.restraints_consents(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_restraints_consents_consent ON public.restraints_consents(consent_given);
