-- Fix can_access_organization function to also check active_organization_id
CREATE OR REPLACE FUNCTION public.can_access_organization(
  user_uuid UUID,
  org_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check if user has active_organization_id matching
  DECLARE
    user_active_org UUID;
  BEGIN
    user_active_org := public.get_active_organization_id(user_uuid);
    
    IF user_active_org = org_uuid THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle case where function might fail
      NULL;
  END;
  
  -- Check if user is in auth.members table
  RETURN EXISTS (
    SELECT 1
    FROM auth.members m
    WHERE m.user_id = user_uuid
      AND m.organization_id = org_uuid::TEXT
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Also ensure the policy is correctly set
DROP POLICY IF EXISTS "Owners can create care homes" ON public.care_homes;

CREATE POLICY "Owners can create care homes"
  ON public.care_homes FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'owner'
    AND public.can_access_organization(auth.uid(), organization_id)
  );
