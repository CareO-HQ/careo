-- ============================================
-- BACKFILL TEAM_STAFF ASSIGNMENTS + KEEP IN SYNC
-- ============================================
-- The Rota Builder lists staff via team_staff rows scoped to the active team.
-- Some staff have users.active_team_id set (during invitation / agency
-- onboarding) but are missing the corresponding team_staff junction row,
-- leaving the rota's Staff Resources list empty. This migration:
--   1. Backfills the missing team_staff rows from users.active_team_id.
--   2. Adds a trigger to keep team_staff in sync on future user changes.

-- 1. Backfill missing rows from users.active_team_id (idempotent)
INSERT INTO public.team_staff (team_id, user_id, role, assigned_at)
SELECT u.active_team_id, u.id, u.role, NOW()
FROM public.users u
WHERE u.active_team_id IS NOT NULL
  AND u.role IN ('nurse', 'care_assistant', 'agency_nurse', 'agency_care_assistant')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 2. Keep team_staff in sync on future users inserts/updates.
-- Only inserts/updates the active-team membership; never deletes other
-- memberships, preserving the many-to-many team_staff model.
CREATE OR REPLACE FUNCTION public.sync_team_staff_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_team_id IS NOT NULL
     AND NEW.role IN ('nurse', 'care_assistant', 'agency_nurse', 'agency_care_assistant') THEN
    INSERT INTO public.team_staff (team_id, user_id, role, assigned_at)
    VALUES (NEW.active_team_id, NEW.id, NEW.role, NOW())
    ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_staff ON public.users;
CREATE TRIGGER trg_sync_team_staff
AFTER INSERT OR UPDATE OF active_team_id, role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_team_staff_membership();
