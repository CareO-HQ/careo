-- ============================================
-- Create get_active_organization_id function
-- ============================================
-- This function retrieves the active_organization_id from the public.users table

CREATE OR REPLACE FUNCTION public.get_active_organization_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT active_organization_id
  FROM public.users
  WHERE id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
