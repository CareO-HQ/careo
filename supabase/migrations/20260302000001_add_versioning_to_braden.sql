-- Add versioning columns to braden_risk_assessments
ALTER TABLE public.braden_risk_assessments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.braden_risk_assessments(id),
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add index for versioning queries if needed
CREATE INDEX IF NOT EXISTS idx_braden_status ON public.braden_risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_braden_previous_version_id ON public.braden_risk_assessments(previous_version_id);
