-- Second signatory fields for medication add and discontinue (dual check)

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discontinuation_checked_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.medications.checked_by IS 'Staff who verified the medication entry (secondary to created_by)';
COMMENT ON COLUMN public.medications.discontinuation_checked_by IS 'Staff who verified medication discontinuation (secondary to discontinued_by)';
