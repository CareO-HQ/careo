-- ============================================
-- Simplify can_access_organization function
-- ============================================
-- This migration simplifies the function to directly query the public.users table
-- instead of relying on get_active_organization_id

CREATE OR REPLACE FUNCTION public.can_access_organization(
  user_uuid UUID,
  org_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_saas_admin(user_uuid) THEN
    RETURN true;
  END IF;
  
  -- Check if user has active_organization_id matching by querying directly
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_uuid 
    AND active_organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
