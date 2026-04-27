-- Create medication_refusals table
CREATE TABLE IF NOT EXISTS public.medication_refusals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES public.medications(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    dose TEXT,
    count TEXT,
    reason_for_return TEXT,
    reason_for_refused TEXT,
    signature TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.medication_refusals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view medication refusals for their organization"
    ON public.medication_refusals FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert medication refusals for their organization"
    ON public.medication_refusals FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update medication refusals for their organization"
    ON public.medication_refusals FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete medication refusals for their organization"
    ON public.medication_refusals FOR DELETE
    USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE medication_refusals;
