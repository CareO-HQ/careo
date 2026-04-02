-- Add medication_id column to prn_protocols for linking to medications
ALTER TABLE public.prn_protocols 
ADD COLUMN IF NOT EXISTS medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prn_protocols_medication ON public.prn_protocols(medication_id);
