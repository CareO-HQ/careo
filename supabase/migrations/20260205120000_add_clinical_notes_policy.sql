-- Add RLS policy for clinical_notes
-- This table was missing from the initial batch of RLS policies

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'clinical_notes' 
        AND policyname = 'Clinical notes isolation'
    ) THEN
        CREATE POLICY "Clinical notes isolation" 
        ON public.clinical_notes FOR ALL
        USING ( public.can_access_organization(organization_id) );
    END IF;
END $$;
