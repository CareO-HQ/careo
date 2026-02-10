-- Migration to add missing staff details to public.users table
-- This resolves the PGRST204 error in the Staff Overview page

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS date_of_join DATE,
ADD COLUMN IF NOT EXISTS right_to_work_status TEXT DEFAULT 'not_verified',
ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_email TEXT,
ADD COLUMN IF NOT EXISTS next_of_kin_address TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.users.address IS 'Full home address of the staff member';
COMMENT ON COLUMN public.users.date_of_join IS 'The date the staff member joined the organization';
COMMENT ON COLUMN public.users.right_to_work_status IS 'Verification status of the staff member''s right to work (verified, pending, expired, not_verified)';
COMMENT ON COLUMN public.users.next_of_kin_name IS 'Full name of the staff member''s next of kin';
COMMENT ON COLUMN public.users.next_of_kin_relationship IS 'Relationship of the next of kin to the staff member';
COMMENT ON COLUMN public.users.next_of_kin_phone IS 'Phone number of the staff member''s next of kin';
COMMENT ON COLUMN public.users.next_of_kin_email IS 'Email address of the staff member''s next of kin';
COMMENT ON COLUMN public.users.next_of_kin_address IS 'Home address of the staff member''s next of kin';
