-- ============================================
-- ADD SLOT_ROLE TO ROTA_SHIFTS
-- ============================================
-- Custom-name shifts (custom_staff_name set, user_id NULL) had no role stored,
-- so the nurse-coverage publish gate counted them as 0 nurses. This column
-- persists which role slot a shift fills ('nurse' or 'care_assistant') so the
-- gate, grid, and metrics recognise custom-name staff.

ALTER TABLE public.rota_shifts
ADD COLUMN IF NOT EXISTS slot_role TEXT;

ALTER TABLE public.rota_shifts
DROP CONSTRAINT IF EXISTS rota_shifts_slot_role_check;

ALTER TABLE public.rota_shifts
ADD CONSTRAINT rota_shifts_slot_role_check
CHECK (slot_role IS NULL OR slot_role IN ('nurse', 'care_assistant'));

-- Backfill slot_role for shifts that already have an assigned user, derived
-- from the user's role. Custom-name shifts created before this migration stay
-- NULL (their original slot is unknown) and can be re-assigned if needed.
UPDATE public.rota_shifts rs
SET slot_role = CASE
  WHEN u.role IN ('nurse', 'agency_nurse') THEN 'nurse'
  WHEN u.role IN ('care_assistant', 'agency_care_assistant') THEN 'care_assistant'
  ELSE rs.slot_role
END
FROM public.users u
WHERE rs.user_id = u.id
  AND rs.slot_role IS NULL;
