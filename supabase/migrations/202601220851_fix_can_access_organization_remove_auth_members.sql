-- ============================================
-- Fix can_access_organization function to remove auth.members reference
-- ============================================
-- This migration fixes the error: 
-- "relation "auth.members" does not exist"
-- by removing the check for the non-existent auth.members table

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
  
  -- Note: Removed the auth.members table check as that table doesn't exist in Supabase
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
