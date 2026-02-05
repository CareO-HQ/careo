-- ============================================
-- FIX FOREIGN KEY RELATIONSHIPS FOR JOINING
-- ============================================

-- PostgREST (Supabase) requires foreign keys to be in the same schema
-- to allow automatic joins. team_staff and care_home_managers currently
-- reference auth.users(id), which is in a different schema.

-- 1. Update team_staff foreign key
ALTER TABLE public.team_staff
DROP CONSTRAINT IF EXISTS unit_staff_user_id_fkey,
DROP CONSTRAINT IF EXISTS team_staff_user_id_fkey;

ALTER TABLE public.team_staff
ADD CONSTRAINT team_staff_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 2. Update care_home_managers foreign key
ALTER TABLE public.care_home_managers
DROP CONSTRAINT IF EXISTS care_home_managers_user_id_fkey;

ALTER TABLE public.care_home_managers
ADD CONSTRAINT care_home_managers_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 3. Update assigned_by references as well (optional but good practice)
ALTER TABLE public.team_staff
DROP CONSTRAINT IF EXISTS unit_staff_assigned_by_fkey,
DROP CONSTRAINT IF EXISTS team_staff_assigned_by_fkey;

ALTER TABLE public.team_staff
ADD CONSTRAINT team_staff_assigned_by_fkey 
FOREIGN KEY (assigned_by) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.care_home_managers
DROP CONSTRAINT IF EXISTS care_home_managers_assigned_by_fkey;

ALTER TABLE public.care_home_managers
ADD CONSTRAINT care_home_managers_assigned_by_fkey 
FOREIGN KEY (assigned_by) 
REFERENCES public.users(id) 
ON DELETE SET NULL;
