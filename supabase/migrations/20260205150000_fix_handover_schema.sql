-- Add missing columns to handover_reports
ALTER TABLE public.handover_reports 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS team_name TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- Add missing columns to handover_comments
ALTER TABLE public.handover_comments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill organization_id for handover_reports from teams table
UPDATE public.handover_reports hr
SET organization_id = t.organization_id
FROM public.teams t
WHERE hr.team_id = t.id AND hr.organization_id IS NULL;

-- Backfill organization_id for handover_comments from residents table
UPDATE public.handover_comments hc
SET organization_id = r.organization_id
FROM public.residents r
WHERE hc.resident_id = r.id AND hc.organization_id IS NULL;

-- Create RLS policies for handover_reports
ALTER TABLE public.handover_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view handover reports in their organization" ON public.handover_reports;
CREATE POLICY "Users can view handover reports in their organization"
  ON public.handover_reports FOR SELECT
  USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Users can insert handover reports in their organization" ON public.handover_reports;
CREATE POLICY "Users can insert handover reports in their organization"
  ON public.handover_reports FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Users can update handover reports in their organization" ON public.handover_reports;
CREATE POLICY "Users can update handover reports in their organization"
  ON public.handover_reports FOR UPDATE
  USING ( public.can_access_organization(organization_id) );

-- Create RLS policies for handover_comments
ALTER TABLE public.handover_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view handover comments in their organization" ON public.handover_comments;
CREATE POLICY "Users can view handover comments in their organization"
  ON public.handover_comments FOR SELECT
  USING ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Users can insert handover comments in their organization" ON public.handover_comments;
CREATE POLICY "Users can insert handover comments in their organization"
  ON public.handover_comments FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

DROP POLICY IF EXISTS "Users can update handover comments in their organization" ON public.handover_comments;
CREATE POLICY "Users can update handover comments in their organization"
  ON public.handover_comments FOR UPDATE
  USING ( public.can_access_organization(organization_id) );
