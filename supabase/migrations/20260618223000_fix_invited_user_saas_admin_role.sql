-- ============================================================
-- Fix Invited Users SaaS Admin Role, Enforce Single SaaS Admin
-- and Prevent Agency Staff from becoming SaaS Admins
-- ============================================================

-- 1. Clean up duplicate SaaS admins (demote all but the oldest SaaS admin)
WITH ranked_admins AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM public.users
  WHERE is_saas_admin = true OR role = 'saas_admin'::public.user_role
)
UPDATE public.users
SET is_saas_admin = false, role = 'care_assistant'::public.user_role
WHERE id IN (SELECT id FROM ranked_admins WHERE rn > 1);

-- 2. Create unique index to enforce single SaaS Admin
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_saas_admin ON public.users (is_saas_admin) WHERE (is_saas_admin = true);

-- 3. Add CHECK constraint to reject agency roles from being SaaS Admins
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_agency_not_saas_admin;
ALTER TABLE public.users ADD CONSTRAINT chk_agency_not_saas_admin CHECK (
  NOT (is_saas_admin = true AND role IN ('agency_nurse', 'agency_care_assistant'))
);

-- 4. Replace setup_new_user_metadata trigger function
CREATE OR REPLACE FUNCTION public.setup_new_user_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_role_text TEXT;
  v_invitation_exists BOOLEAN;
  v_invitation_role TEXT;
  v_saas_admin_exists BOOLEAN;
  v_is_agency_staff_db BOOLEAN;
BEGIN
  RAISE NOTICE 'DEBUG: setup_new_user_metadata triggered for email: %', NEW.email;

  -- Check if they exist in the agency_staff table by email
  SELECT EXISTS(SELECT 1 FROM public.agency_staff WHERE email = NEW.email)
  INTO v_is_agency_staff_db;

  -- 1. If it's agency staff (passed from raw_user_meta_data or found in agency_staff table)
  IF COALESCE((NEW.raw_user_meta_data->>'is_agency_staff')::BOOLEAN, false) OR v_is_agency_staff_db THEN
    -- Get their role, ensuring they are NEVER saas_admin
    v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'supervisor');
    IF v_role_text = 'saas_admin' THEN
      v_role_text := 'supervisor';
    END IF;
    
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{is_agency_staff}',
      'true'::jsonb
    );
    NEW.raw_app_meta_data := jsonb_set(
      NEW.raw_app_meta_data,
      '{is_saas_admin}',
      'false'::jsonb
    );
    NEW.raw_app_meta_data := jsonb_set(
      NEW.raw_app_meta_data,
      '{role}',
      to_jsonb(v_role_text)
    );
    RETURN NEW;
  END IF;

  -- 2. Check if there's a pending invitation for this email
  SELECT 
    EXISTS(SELECT 1 FROM public.invitations WHERE email = NEW.email AND status = 'pending'),
    COALESCE((SELECT role FROM public.invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1)::TEXT, 'care_assistant')
  INTO v_invitation_exists, v_invitation_role;

  IF v_invitation_exists THEN
    -- User is joining via invitation - DON'T make them saas_admin
    RAISE NOTICE 'DEBUG: User % has pending invitation with role %', NEW.email, v_invitation_role;
    
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{is_saas_admin}',
      'false'::jsonb
    );
    
    -- Ensure role is not saas_admin
    IF v_invitation_role = 'saas_admin' THEN
      v_invitation_role := 'care_assistant';
    END IF;
    
    NEW.raw_app_meta_data := jsonb_set(
      NEW.raw_app_meta_data,
      '{role}',
      to_jsonb(v_invitation_role)
    );
  ELSE
    -- 3. No invitation - check if a SaaS Admin already exists
    SELECT EXISTS(
      SELECT 1 FROM public.users WHERE is_saas_admin = true OR role = 'saas_admin'
    ) INTO v_saas_admin_exists;

    IF v_saas_admin_exists THEN
      -- A SaaS Admin already exists. Do not allow creating another one.
      -- Default to a regular role (e.g., care_assistant)
      RAISE NOTICE 'DEBUG: SaaS Admin already exists. Setting default role (care_assistant) for %', NEW.email;
      
      NEW.raw_app_meta_data := jsonb_set(
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
        '{is_saas_admin}',
        'false'::jsonb
      );
      NEW.raw_app_meta_data := jsonb_set(
        NEW.raw_app_meta_data,
        '{role}',
        '"care_assistant"'::jsonb
      );
    ELSE
      -- No SaaS Admin exists yet. Make this user the SaaS Admin (for testing/development setup)
      RAISE NOTICE 'DEBUG: No invitation found and no SaaS Admin exists. Setting as SaaS Admin for %', NEW.email;
      
      NEW.raw_app_meta_data := jsonb_set(
        COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
        '{is_saas_admin}',
        'true'::jsonb
      );
      NEW.raw_app_meta_data := jsonb_set(
        NEW.raw_app_meta_data,
        '{role}',
        '"saas_admin"'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
