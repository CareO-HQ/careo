-- Add missing columns to fall_risk_assessments table
ALTER TABLE public.fall_risk_assessments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES public.fall_risk_assessments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Update existing records if any (though likely none yet)
UPDATE public.fall_risk_assessments SET created_by = user_id WHERE created_by IS NULL;
