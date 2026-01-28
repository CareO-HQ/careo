-- Add RLS Policies for Care Plan Assessments Table
-- Allows nurses, managers, and owners to submit care plans

-- Enable RLS on care_plan_assessments table if not already enabled
ALTER TABLE public.care_plan_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view care plans in their organization" ON public.care_plan_assessments;
DROP POLICY IF EXISTS "Nurses, managers, and owners can create care plans" ON public.care_plan_assessments;
DROP POLICY IF EXISTS "Users can update care plans in their organization" ON public.care_plan_assessments;
DROP POLICY IF EXISTS "Users can delete care plans in their organization" ON public.care_plan_assessments;

-- Allow users to view care plans in their organization
CREATE POLICY "Users can view care plans in their organization"
  ON public.care_plan_assessments FOR SELECT
  USING ( public.can_access_organization(organization_id) );

-- Allow nurses, managers, and owners to create care plans
CREATE POLICY "Nurses, managers, and owners can create care plans"
  ON public.care_plan_assessments FOR INSERT
  WITH CHECK ( 
    public.can_access_organization(organization_id)
    AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
  );

-- Allow users to update care plans in their organization
CREATE POLICY "Users can update care plans in their organization"
  ON public.care_plan_assessments FOR UPDATE
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- Allow users to delete care plans in their organization
CREATE POLICY "Users can delete care plans in their organization"
  ON public.care_plan_assessments FOR DELETE
  USING ( public.can_access_organization(organization_id) );

-- Enable RLS on dependent tables
ALTER TABLE public.care_plan_evaluations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view care plan evaluations in their organization" ON public.care_plan_evaluations;
DROP POLICY IF EXISTS "Nurses, managers, and owners can create care plan evaluations" ON public.care_plan_evaluations;

CREATE POLICY "Users can view care plan evaluations in their organization"
  ON public.care_plan_evaluations FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurses, managers, and owners can create care plan evaluations"
  ON public.care_plan_evaluations FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
  );

-- Enable RLS on care_plan_reminders
ALTER TABLE public.care_plan_reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view care plan reminders in their organization" ON public.care_plan_reminders;
DROP POLICY IF EXISTS "Nurses, managers, and owners can create care plan reminders" ON public.care_plan_reminders;

CREATE POLICY "Users can view care plan reminders in their organization"
  ON public.care_plan_reminders FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Nurses, managers, and owners can create care plan reminders"
  ON public.care_plan_reminders FOR INSERT
  WITH CHECK (
    public.can_access_organization(organization_id)
    AND (public.get_user_role(auth.uid()) IN ('nurse', 'manager', 'owner', 'saas_admin'))
  );
