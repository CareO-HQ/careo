-- Migration: Create oral_assessment_evaluations table
-- Date: March 10, 2026

CREATE TABLE IF NOT EXISTS public.oral_assessment_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    organization_id UUID,
    completed_by TEXT,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    lips BOOLEAN NOT NULL DEFAULT false,
    tongue BOOLEAN NOT NULL DEFAULT false,
    dentures BOOLEAN NOT NULL DEFAULT false,
    teeth BOOLEAN NOT NULL DEFAULT false,
    saliva BOOLEAN NOT NULL DEFAULT false,
    pain BOOLEAN NOT NULL DEFAULT false,
    gums_soft_tissue BOOLEAN NOT NULL DEFAULT false,
    swallowing BOOLEAN NOT NULL DEFAULT false,
    nutrition BOOLEAN NOT NULL DEFAULT false,
    speech_difficulty BOOLEAN NOT NULL DEFAULT false,
    dexterity_problems BOOLEAN NOT NULL DEFAULT false,
    cognitive_function BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oral_assessment_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow all for authenticated users within same organization
CREATE POLICY "Allow select for org members" ON public.oral_assessment_evaluations
    FOR SELECT USING (
        organization_id IN (
            SELECT active_organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Allow insert for org members" ON public.oral_assessment_evaluations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT active_organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Allow update for org members" ON public.oral_assessment_evaluations
    FOR UPDATE USING (
        organization_id IN (
            SELECT active_organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Allow delete for org members" ON public.oral_assessment_evaluations
    FOR DELETE USING (
        organization_id IN (
            SELECT active_organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Index for fast lookups by resident
CREATE INDEX IF NOT EXISTS idx_oral_assessment_evaluations_resident_id
    ON public.oral_assessment_evaluations(resident_id);
