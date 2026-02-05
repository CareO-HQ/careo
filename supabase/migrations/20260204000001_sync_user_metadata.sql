-- ============================================
-- Sync User Metadata Trigger
-- ============================================
-- This migration creates a trigger to automatically sync user context
-- from public.users table to auth.users app_metadata.
-- This is critical for RLS policies that rely on JWT app_metadata.

CREATE OR REPLACE FUNCTION public.sync_user_metadata_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- Update auth.users raw_app_meta_data
    -- We use jsonb_concat to merge the existing metadata with our new values
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'role', NEW.role,
            'active_organization_id', NEW.active_organization_id,
            'active_care_home_id', NEW.active_care_home_id,
            'active_team_id', NEW.active_team_id,
            'is_onboarding_complete', NEW.is_onboarding_complete,
            'is_saas_admin', COALESCE(NEW.is_saas_admin, false)
        )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_user_change_sync_metadata ON public.users;
CREATE TRIGGER on_user_change_sync_metadata
    AFTER INSERT OR UPDATE OF 
        role, 
        active_organization_id, 
        active_care_home_id, 
        active_team_id, 
        is_onboarding_complete, 
        is_saas_admin
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_metadata_to_auth();

-- One-time sync for existing users
-- This ensures all current users have correct metadata
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.users LOOP
        UPDATE auth.users
        SET raw_app_meta_data = 
            COALESCE(raw_app_meta_data, '{}'::jsonb) || 
            jsonb_build_object(
                'role', r.role,
                'active_organization_id', r.active_organization_id,
                'active_care_home_id', r.active_care_home_id,
                'active_team_id', r.active_team_id,
                'is_onboarding_complete', r.is_onboarding_complete,
                'is_saas_admin', COALESCE(r.is_saas_admin, false)
            )
        WHERE id = r.id;
    END LOOP;
END $$;
